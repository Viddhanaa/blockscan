#!/bin/bash

# Viddhana Blockscan - Stop All Geth Processes
# Gracefully stops all running geth instances

echo "=========================================="
echo "  Stopping Viddhana Blockscan Nodes"
echo "=========================================="
echo ""

# Find all geth processes
GETH_PIDS=$(pgrep -f "geth.*networkid 1337" 2>/dev/null)

if [ -z "$GETH_PIDS" ]; then
    echo "No Viddhana Blockscan geth processes found running."
    
    # Also check for any geth process
    ALL_GETH=$(pgrep geth 2>/dev/null)
    if [ -n "$ALL_GETH" ]; then
        echo ""
        echo "Other geth processes found:"
        ps aux | grep "[g]eth" | head -10
        echo ""
        read -p "Do you want to stop ALL geth processes? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            echo "Stopping all geth processes..."
            pkill geth
            sleep 2
            
            # Force kill if still running
            if pgrep geth > /dev/null 2>&1; then
                echo "Force killing remaining processes..."
                pkill -9 geth
            fi
            echo "All geth processes stopped."
        fi
    fi
else
    echo "Found Viddhana Blockscan geth processes:"
    echo "$GETH_PIDS"
    echo ""
    
    # Try graceful shutdown first
    echo "Sending SIGTERM for graceful shutdown..."
    for pid in $GETH_PIDS; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "  Stopping PID $pid..."
            kill -TERM "$pid" 2>/dev/null
        fi
    done
    
    # Wait for graceful shutdown
    echo "Waiting for processes to terminate..."
    sleep 5
    
    # Check if any are still running and force kill
    REMAINING=$(pgrep -f "geth.*networkid 1337" 2>/dev/null)
    if [ -n "$REMAINING" ]; then
        echo "Force killing remaining processes..."
        for pid in $REMAINING; do
            kill -9 "$pid" 2>/dev/null
        done
        sleep 1
    fi
    
    # Verify all stopped
    FINAL_CHECK=$(pgrep -f "geth.*networkid 1337" 2>/dev/null)
    if [ -z "$FINAL_CHECK" ]; then
        echo ""
        echo "All Viddhana Blockscan nodes stopped successfully."
    else
        echo ""
        echo "Warning: Some processes may still be running:"
        echo "$FINAL_CHECK"
    fi
fi

# Clean up lock files if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

for node in node1 node2; do
    LOCK_FILE="$PROJECT_DIR/$node/data/geth/LOCK"
    if [ -f "$LOCK_FILE" ]; then
        echo "Removing lock file: $LOCK_FILE"
        rm -f "$LOCK_FILE"
    fi
done

echo ""
echo "Done."
