#!/bin/bash
# =============================================================================
# Viddhana Blockscan - Health Check Script
# Phase 4: Explorer Infrastructure
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Service endpoints
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
GETH_RPC_URL="${GETH_RPC_URL:-http://localhost:8545}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

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
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# -----------------------------------------------------------------------------
# Container Status Check
# -----------------------------------------------------------------------------

check_containers() {
    log_info "Checking container status..."
    echo ""
    
    local containers=("viddhana-blockscout-postgres" "viddhana-blockscout-redis" "viddhana-smart-contract-verifier" "viddhana-blockscout-backend" "viddhana-blockscout-frontend")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            local state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
            
            if [ "$state" = "running" ]; then
                if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
                    log_success "$container: running (health: $status)"
                else
                    log_warning "$container: running (health: $status)"
                    all_healthy=false
                fi
            else
                log_error "$container: $state"
                all_healthy=false
            fi
        else
            log_error "$container: not found"
            all_healthy=false
        fi
    done
    
    echo ""
    if [ "$all_healthy" = true ]; then
        log_success "All containers are running"
    else
        log_warning "Some containers are not healthy"
    fi
    
    return 0
}

# -----------------------------------------------------------------------------
# Backend API Check
# -----------------------------------------------------------------------------

check_backend_api() {
    log_info "Checking Blockscout Backend API..."
    echo ""
    
    # Check API v2 stats endpoint
    local stats_response
    if stats_response=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_API_URL}/api/v2/stats" 2>/dev/null); then
        if [ "$stats_response" = "200" ]; then
            log_success "Backend API is responding (HTTP $stats_response)"
            
            # Get additional stats
            local stats_data=$(curl -s "${BACKEND_API_URL}/api/v2/stats" 2>/dev/null)
            if [ -n "$stats_data" ]; then
                local total_blocks=$(echo "$stats_data" | jq -r '.total_blocks // "N/A"' 2>/dev/null)
                local total_addresses=$(echo "$stats_data" | jq -r '.total_addresses // "N/A"' 2>/dev/null)
                local total_transactions=$(echo "$stats_data" | jq -r '.total_transactions // "N/A"' 2>/dev/null)
                
                echo "  - Total Blocks: $total_blocks"
                echo "  - Total Addresses: $total_addresses"
                echo "  - Total Transactions: $total_transactions"
            fi
        else
            log_error "Backend API returned HTTP $stats_response"
        fi
    else
        log_error "Backend API is not reachable"
    fi
    
    # Check health endpoint
    local health_response
    if health_response=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_API_URL}/api/health" 2>/dev/null); then
        if [ "$health_response" = "200" ]; then
            log_success "Backend health endpoint is OK"
        else
            log_warning "Backend health endpoint returned HTTP $health_response"
        fi
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Frontend Check
# -----------------------------------------------------------------------------

check_frontend() {
    log_info "Checking Blockscout Frontend..."
    echo ""
    
    local frontend_response
    if frontend_response=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null); then
        if [ "$frontend_response" = "200" ]; then
            log_success "Frontend is responding (HTTP $frontend_response)"
        else
            log_error "Frontend returned HTTP $frontend_response"
        fi
    else
        log_error "Frontend is not reachable"
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Indexing Lag Check
# -----------------------------------------------------------------------------

check_indexing_lag() {
    log_info "Checking indexing lag against Geth..."
    echo ""
    
    # Get latest block from Geth
    local geth_block_hex
    geth_block_hex=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "${GETH_RPC_URL}" 2>/dev/null | jq -r '.result // "0x0"' 2>/dev/null)
    
    if [ -z "$geth_block_hex" ] || [ "$geth_block_hex" = "null" ]; then
        log_error "Cannot connect to Geth RPC"
        echo ""
        return 1
    fi
    
    # Convert hex to decimal
    local geth_block=$((16#${geth_block_hex#0x}))
    log_info "Geth latest block: $geth_block"
    
    # Get indexed block from Blockscout
    local blockscout_stats
    blockscout_stats=$(curl -s "${BACKEND_API_URL}/api/v2/stats" 2>/dev/null)
    
    if [ -z "$blockscout_stats" ]; then
        log_error "Cannot get Blockscout stats"
        echo ""
        return 1
    fi
    
    local indexed_block=$(echo "$blockscout_stats" | jq -r '.total_blocks // 0' 2>/dev/null)
    
    # Blockscout returns total blocks (count), which is the same as latest block number + 1 for zero-indexed
    # Adjusting comparison accordingly
    log_info "Blockscout indexed blocks: $indexed_block"
    
    # Calculate lag
    local lag=$((geth_block - indexed_block + 1))
    
    if [ $lag -le 0 ]; then
        log_success "Indexer is fully synced (no lag)"
    elif [ $lag -le 5 ]; then
        log_success "Indexer is nearly synced (lag: $lag blocks)"
    elif [ $lag -le 100 ]; then
        log_warning "Indexer is behind (lag: $lag blocks)"
    else
        log_error "Indexer is significantly behind (lag: $lag blocks)"
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Database Check
# -----------------------------------------------------------------------------

check_database() {
    log_info "Checking PostgreSQL database..."
    echo ""
    
    # Check if we can connect via docker
    if docker exec viddhana-blockscout-postgres pg_isready -U blockscout -d blockscout > /dev/null 2>&1; then
        log_success "PostgreSQL is accepting connections"
        
        # Get database size
        local db_size=$(docker exec viddhana-blockscout-postgres psql -U blockscout -d blockscout -t -c "SELECT pg_size_pretty(pg_database_size('blockscout'));" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$db_size" ]; then
            echo "  - Database size: $db_size"
        fi
        
        # Get connection count
        local conn_count=$(docker exec viddhana-blockscout-postgres psql -U blockscout -d blockscout -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'blockscout';" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$conn_count" ]; then
            echo "  - Active connections: $conn_count"
        fi
    else
        log_error "PostgreSQL is not responding"
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Redis Check
# -----------------------------------------------------------------------------

check_redis() {
    log_info "Checking Redis..."
    echo ""
    
    if docker exec viddhana-blockscout-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis is responding"
        
        # Get memory usage
        local memory_used=$(docker exec viddhana-blockscout-redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '[:space:]')
        if [ -n "$memory_used" ]; then
            echo "  - Memory used: $memory_used"
        fi
        
        # Get connected clients
        local clients=$(docker exec viddhana-blockscout-redis redis-cli info clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '[:space:]')
        if [ -n "$clients" ]; then
            echo "  - Connected clients: $clients"
        fi
    else
        log_error "Redis is not responding"
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Smart Contract Verifier Check
# -----------------------------------------------------------------------------

check_sc_verifier() {
    log_info "Checking Smart Contract Verifier..."
    echo ""
    
    local sc_response
    if sc_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8050/health" 2>/dev/null); then
        if [ "$sc_response" = "200" ]; then
            log_success "Smart Contract Verifier is healthy (HTTP $sc_response)"
        else
            log_warning "Smart Contract Verifier returned HTTP $sc_response"
        fi
    else
        log_error "Smart Contract Verifier is not reachable"
    fi
    
    echo ""
    return 0
}

# -----------------------------------------------------------------------------
# Main Function
# -----------------------------------------------------------------------------

main() {
    echo ""
    echo "============================================================================="
    echo "  Viddhana Blockscan - Health Check"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================================================="
    echo ""
    
    check_containers
    check_database
    check_redis
    check_sc_verifier
    check_backend_api
    check_frontend
    check_indexing_lag
    
    echo "============================================================================="
    echo "  Health check completed"
    echo "============================================================================="
    echo ""
}

# Run main function
main "$@"
