#!/usr/bin/env bash
grep -rlE "from '(src)/" src tests dev | while read -r file; do
  dir=$(dirname "$file")
  rel=$(realpath --relative-to="$dir" src)
  case "$rel" in .*) ;; *) rel="./$rel" ;; esac
  sed -i -E "s#from '(src)/#from '${rel}/#g" "$file"
done

pnpm run lint --fix