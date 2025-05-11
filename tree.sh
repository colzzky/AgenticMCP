#!/bin/bash

echo '```markdown'

# Step 1: Build map of git-tracked file statuses (excluding untracked)
git status --porcelain -z | while IFS= read -r -d '' status_line; do
  status="${status_line:0:2}"
  [[ "$status" == "??" ]] && continue  # skip untracked
  path="${status_line:3}"
  echo -e "$status\t$path"
done > .git_tree_status.tmp

# Step 2: Get list of all git-tracked files only
git ls-files > .git_tree_files.tmp

# Step 3: Git status explanation
get_status() {
  local path="$1"
  local line
  line=$(grep -F -- "$path" .git_tree_status.tmp)

  if [[ $line == "A "* ]]; then
    echo " (new file)"
  elif [[ $line == " M"* ]]; then
    added=$(git diff --numstat "$path" | awk '{print $1}')
    echo " +$added"
  elif [[ $line == "D "* ]]; then
    echo " (deleted)"
  elif [[ $line == R* ]]; then
    old=$(echo "$line" | awk '{print $3}')
    echo " (renamed from $old)"
  else
    echo ""
  fi
}

# Step 4: Print tree recursively in Markdown
print_tree() {
  local prefix="$1"
  local dir="$2"

  local entries=()
  while IFS= read -r entry; do
    basename=$(basename "$entry")

    # Exclude dot-directories and __pycache__
    if [[ "$basename" == .* || "$basename" == "__pycache__" || "$basename" == "node_modules" || "$basename" == "dist" ]]; then
      continue
    fi

    entries+=("$entry")
  done < <(find "$dir" -mindepth 1 -maxdepth 1 | LC_ALL=C sort)

  local total=${#entries[@]}
  local count=0

  for entry in "${entries[@]}"; do
    ((count++))
    local name=$(basename "$entry")
    local rel_path="${entry#./}"
    local connector="├── "
    local next_prefix="│   "
    [[ $count -eq $total ]] && connector="└── " && next_prefix="    "

    if [[ -d "$entry" ]]; then
      echo "${prefix}${connector}${name}/"
      print_tree "${prefix}${next_prefix}" "$entry"
    else
      if grep -qxF "$rel_path" .git_tree_files.tmp; then
        local status
        status=$(get_status "$rel_path")
        echo "${prefix}${connector}${name}${status}"
      fi
    fi
  done
}

# Output tree in markdown
echo "."
print_tree "" "."
echo '```'

# Cleanup
rm -f .git_tree_status.tmp .git_tree_files.tmp
