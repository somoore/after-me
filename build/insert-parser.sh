#!/bin/bash
set -e

echo "Inserting lossless parser into index.html..."

# Extract parts
head -n 4601 index.html > build/part1.tmp
tail -n +4602 index.html > build/part2.tmp

# Create new index.html with enhanced parser inserted
cat build/part1.tmp > index-new.html
cat >> index-new.html << 'PARSER'

// =============================================================================
// LOSSLESS GEDCOM PARSER - Phase 2
// Dual-model architecture: canonical (lossless) + friendly (UI-optimized)
// =============================================================================

PARSER

cat build/parser-enhanced.js >> index-new.html

echo "" >> index-new.html
echo "// =============================================================================" >> index-new.html
echo "// LEGACY PARSER - Kept for backward compatibility" >> index-new.html
echo "// =============================================================================" >> index-new.html
echo "" >> index-new.html

cat build/part2.tmp >> index-new.html

# Cleanup
rm build/part1.tmp build/part2.tmp

echo "✅ Parser integrated!"
echo "   Output: index-new.html ($(ls -lh index-new.html | awk '{print $5}'))"
echo "   Next: Replace index.html with index-new.html"
