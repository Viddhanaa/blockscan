#!/bin/bash
# =============================================================================
# Viddhana Blockscan - Database Backup Script
# Phase 4: Explorer Infrastructure
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/backups}"

# Database configuration
DB_CONTAINER="${DB_CONTAINER:-viddhana-blockscout-postgres}"
DB_USER="${POSTGRES_USER:-blockscout}"
DB_NAME="${POSTGRES_DB:-blockscout}"

# Retention settings
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="blockscout_backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if the database container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        log_error "Database container '${DB_CONTAINER}' is not running"
        exit 1
    fi
    
    # Check if backup directory exists, create if not
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Check available disk space (minimum 1GB)
    local available_space=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$available_space" -lt 1 ]; then
        log_error "Insufficient disk space. Available: ${available_space}GB, Required: 1GB"
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
}

# -----------------------------------------------------------------------------
# Create Backup
# -----------------------------------------------------------------------------

create_backup() {
    log_info "Starting database backup..."
    log_info "Database: $DB_NAME"
    log_info "Container: $DB_CONTAINER"
    log_info "Output: $BACKUP_DIR/$BACKUP_FILENAME"
    
    # Get database size for progress info
    local db_size=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d '[:space:]')
    log_info "Database size: $db_size"
    
    # Create the backup using pg_dump with compression
    log_info "Running pg_dump..."
    
    if docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        2>/dev/null | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"; then
        
        # Verify backup file was created and has content
        if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
            local backup_size=$(ls -lh "${BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $5}')
            local backup_size_bytes=$(stat -f%z "${BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null || stat -c%s "${BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null)
            
            if [ "$backup_size_bytes" -gt 100 ]; then
                log_success "Backup created successfully"
                log_info "Backup file: ${BACKUP_FILENAME}"
                log_info "Backup size: ${backup_size}"
                
                # Create a checksum
                local checksum=$(sha256sum "${BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $1}')
                echo "$checksum  $BACKUP_FILENAME" > "${BACKUP_DIR}/${BACKUP_FILENAME}.sha256"
                log_info "Checksum saved: ${BACKUP_FILENAME}.sha256"
            else
                log_error "Backup file is too small, backup may have failed"
                rm -f "${BACKUP_DIR}/${BACKUP_FILENAME}"
                exit 1
            fi
        else
            log_error "Backup file was not created"
            exit 1
        fi
    else
        log_error "pg_dump failed"
        rm -f "${BACKUP_DIR}/${BACKUP_FILENAME}"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Cleanup Old Backups
# -----------------------------------------------------------------------------

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        log_info "Deleting old backup: $(basename "$file")"
        rm -f "$file"
        rm -f "${file}.sha256"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "blockscout_backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -print0 2>/dev/null)
    
    if [ "$deleted_count" -gt 0 ]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log_info "No old backups to delete"
    fi
    
    # List remaining backups
    log_info "Current backups:"
    ls -lh "${BACKUP_DIR}"/blockscout_backup_*.sql.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
    
    # Show disk usage
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
    log_info "Total backup directory size: $total_size"
}

# -----------------------------------------------------------------------------
# Verify Backup
# -----------------------------------------------------------------------------

verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Check if file can be gunzipped (basic integrity check)
    if gzip -t "${BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null; then
        log_success "Backup file is valid gzip archive"
    else
        log_error "Backup file is corrupted"
        exit 1
    fi
    
    # Verify checksum if exists
    if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}.sha256" ]; then
        cd "$BACKUP_DIR"
        if sha256sum -c "${BACKUP_FILENAME}.sha256" > /dev/null 2>&1; then
            log_success "Checksum verification passed"
        else
            log_error "Checksum verification failed"
            exit 1
        fi
        cd - > /dev/null
    fi
}

# -----------------------------------------------------------------------------
# Usage
# -----------------------------------------------------------------------------

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Viddhana Blockscan Database Backup Script

Options:
    -d, --dir DIR       Backup directory (default: ./backups)
    -r, --retention N   Retention days (default: 7)
    -c, --container     Container name (default: viddhana-blockscout-postgres)
    -v, --verify-only   Only verify the latest backup
    -l, --list          List existing backups
    -h, --help          Show this help message

Examples:
    $(basename "$0")                    # Create backup with defaults
    $(basename "$0") -d /mnt/backups    # Custom backup directory
    $(basename "$0") -r 14              # Keep 14 days of backups
    $(basename "$0") -l                 # List existing backups
EOF
}

# -----------------------------------------------------------------------------
# List Backups
# -----------------------------------------------------------------------------

list_backups() {
    log_info "Listing existing backups in $BACKUP_DIR:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        local count=$(find "$BACKUP_DIR" -name "blockscout_backup_*.sql.gz" -type f 2>/dev/null | wc -l)
        
        if [ "$count" -gt 0 ]; then
            printf "%-45s %10s %20s\n" "Filename" "Size" "Date"
            printf "%s\n" "$(printf '%.0s-' {1..80})"
            
            find "$BACKUP_DIR" -name "blockscout_backup_*.sql.gz" -type f -printf "%f %s %Tc\n" 2>/dev/null | \
            sort -r | \
            while read -r name size date; do
                local human_size=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "$size")
                printf "%-45s %10s %20s\n" "$name" "$human_size" "$date"
            done
            
            echo ""
            log_info "Total backups: $count"
            local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
            log_info "Total size: $total_size"
        else
            log_warning "No backups found"
        fi
    else
        log_warning "Backup directory does not exist: $BACKUP_DIR"
    fi
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------

VERIFY_ONLY=false
LIST_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -c|--container)
            DB_CONTAINER="$2"
            shift 2
            ;;
        -v|--verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Main Function
# -----------------------------------------------------------------------------

main() {
    echo ""
    echo "============================================================================="
    echo "  Viddhana Blockscan - Database Backup"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================================================="
    echo ""
    
    if [ "$LIST_ONLY" = true ]; then
        list_backups
        exit 0
    fi
    
    if [ "$VERIFY_ONLY" = true ]; then
        # Find latest backup
        BACKUP_FILENAME=$(find "$BACKUP_DIR" -name "blockscout_backup_*.sql.gz" -type f -printf "%T+ %f\n" 2>/dev/null | sort -r | head -1 | awk '{print $2}')
        if [ -n "$BACKUP_FILENAME" ]; then
            verify_backup
        else
            log_error "No backups found to verify"
            exit 1
        fi
        exit 0
    fi
    
    preflight_checks
    create_backup
    verify_backup
    cleanup_old_backups
    
    echo ""
    echo "============================================================================="
    echo "  Backup completed successfully"
    echo "============================================================================="
    echo ""
}

# Run main function
main "$@"
