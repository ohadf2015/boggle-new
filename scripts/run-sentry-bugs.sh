#!/bin/bash
# Automated Sentry Bug Processor
# Runs every 4 hours via LaunchAgent to fetch and fix recent Sentry errors

# Configuration
PROJECT_DIR="/Users/ohadfisher/git/boggle-new"
LOG_DIR="$HOME/logs/claude-sentry"
LOG_FILE="$LOG_DIR/sentry-bugs-$(date +%Y%m%d-%H%M%S).log"
HOURS_LOOKBACK="${1:-4}"  # Default to 4 hours, can override with argument

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log start
echo "========================================" | tee -a "$LOG_FILE"
echo "Sentry Bug Processor Started: $(date)" | tee -a "$LOG_FILE"
echo "Looking back: ${HOURS_LOOKBACK} hours" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Change to project directory
cd "$PROJECT_DIR" || {
    echo "ERROR: Cannot cd to $PROJECT_DIR" | tee -a "$LOG_FILE"
    exit 1
}

# Run Claude with the sentry-bugs command, filtering for recent issues
# The prompt explicitly asks to only look at issues from the last N hours
claude -p "Run /sentry-bugs but ONLY process Sentry errors from the last ${HOURS_LOOKBACK} hours. When using search_issues, filter by time to only get issues that occurred in the last ${HOURS_LOOKBACK} hours. Skip any issues older than ${HOURS_LOOKBACK} hours." \
    --allowedTools '*' \
    2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=$?

# Log completion
echo "========================================" | tee -a "$LOG_FILE"
echo "Completed: $(date) with exit code: $EXIT_CODE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Keep only last 30 log files (5 days worth at 4-hour intervals)
ls -t "$LOG_DIR"/sentry-bugs-*.log 2>/dev/null | tail -n +31 | xargs -r rm

exit $EXIT_CODE
