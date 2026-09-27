#!/bin/bash

# Add missing translations using sed to directly modify the files

# Function to add a key-value before a closing brace
add_key_before_closing() {
    local file=$1
    local section_pattern=$2
    local key=$3
    local value=$4
    
    # Escape special characters for sed
    local escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g' | sed "s/'/\\\\'/g")
    
    # Find the section and add the key before its closing brace
    sed -i.bak "/$section_pattern/,/^  }/ {
        /^  }/ i\\
    \"$key\": \"$escaped_value\",
    }" "$file"
}

cd /Users/ohadfisher/git/boggle-new/fe-next/translations

# Process English
echo "Processing en.js..."
# Add achievement section before achievements section
sed -i.bak '/^  "achievements": {$/i\
  "achievement": {\
    "dailyDouble": "Daily Double",\
    "dailyDouble.desc": "Complete both daily challenges in one day"\
  },' en.js

# Add buzz keys
sed -i.bak2 '/^  "buzz": {$/,/^  },$/{ 
/^  },$/i\
    "badge": "NEW",\
    "betaPreview": "Beta Preview",\
    "challenges": "challenges",\
    "connectingWord": "Connecting word",\
    "error": "Failed to load challenge",\
    "feature1": "Daily trending topics",\
    "feature2": "Shareable results",\
    "feature3": "No time pressure",\
    "fillTheBlank": "Fill in the blank",\
    "finish": "Finish",\
    "helpText": "Solve word puzzles based on today'"'"'s trending topics",\
    "loading": "Loading challenge...",\
    "maxScore": "Max score",\
    "noTimeLimit": "No time limit",\
    "preview": {\
      "play": "Start Playing",\
      "subtitle": "5 word challenges. No timer. Just you and the trends.",\
      "title": "Today'"'"'s Daily Buzz"\
    },\
    "quitConfirm": "Your progress won'"'"'t be saved. Quit anyway?",\
    "quitConfirmTitle": "Leave Daily Buzz?",\
    "results": {\
      "perfect": "PERFECT BUZZ!"\
    },\
    "searches": "trending searches",\
    "topicIs": "Topic",\
    "total": "Total",\
    "trio": {\
      "hint": "What word connects all three?"\
    },\
    "viewResults": "View Results",\
    "yourAnswer": "Your answer",\
    "yourScore": "Your Score",
}' en.js

# Add common.pts
sed -i.bak3 '/^  "common": {$/,/^  },$/{ 
/^  },$/i\
    "pts": "pts",
}' en.js

# Add daily keys  
sed -i.bak4 '/^    "daily": {$/,/^    },$/{ 
/^    },$/i\
      "chooseChallengeHint": "Pick your daily quest and compete on the global leaderboard",\
      "chooseQuest": "Choose Your Daily Quest",\
      "new": "NEW",\
      "play": "Play",\
      "viewResults": "View Results",\
      "wordHunt": "Word Hunt",\
      "wordHunt.desc": "Find as many words as you can in 3 minutes",\
      "wordHunt.feature1": "Timed challenge",\
      "wordHunt.feature2": "Global leaderboard",\
      "wordHunt.feature3": "Share your score",\
      "wordHunt.subtitle": "3 minutes. Find all the words you can.",
}' en.js

# Clean up backup files
rm -f en.js.bak*

echo "✓ Updated en.js"
echo "Note: Other languages need to be updated similarly"
