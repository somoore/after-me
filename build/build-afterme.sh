#!/bin/bash
# After Me v2 Builder - Creates completely self-contained HTML
set -e

echo "Building After Me v2 - Archival-Grade Time Capsule..."

OUTPUT="index-v2.html"

# Create header
cat > "$OUTPUT" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>After Me</title>
  <script>
EOF

# Inline libraries
echo "  Inlining Cytoscape.js ($(wc -c < cytoscape.min.js) bytes)..."
cat cytoscape.min.js >> "$OUTPUT"

echo "  Inlining Dagre ($(wc -c < dagre.min.js) bytes)..."
echo "" >> "$OUTPUT"
cat dagre.min.js >> "$OUTPUT"

echo "  Inlining cytoscape-dagre ($(wc -c < cytoscape-dagre.min.js) bytes)..."
echo "" >> "$OUTPUT"
cat cytoscape-dagre.min.js >> "$OUTPUT"

echo "  Inlining Pako ($(wc -c < pako.min.js) bytes)..."
echo "" >> "$OUTPUT"
cat pako.min.js >> "$OUTPUT"

echo "  </script>" >> "$OUTPUT"

# Extract and modify styles from original (remove Google Fonts)
echo "  Adding styles with system fonts..."
sed -n '11,148p' index.html | \
  sed 's/@import.*googleapis.*//' | \
  sed "s/'Cormorant Garamond', Georgia, serif/var(--font-serif)/g" | \
  sed "s/'Inter', sans-serif/var(--font-sans)/g" >> "$OUTPUT"

# Add font variables to CSS
sed -i '' '/<style>/a\
    /* System Font Stack - No external dependencies */\
    :root {\
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;\
      --font-serif: Georgia, Cambria, "Times New Roman", Times, serif;\
' "$OUTPUT"

# Add HTML body structure
echo "</head>" >> "$OUTPUT"
echo "<body>" >> "$OUTPUT"
sed -n '150,296p' index.html >> "$OUTPUT"

# Add enhanced utilities and application code
echo "  Adding Phase 1 utility improvements..."
cat >> "$OUTPUT" << 'JSEOF'

  <script>
// =============================================================================
// PHASE 1 UTILITY IMPROVEMENTS
// =============================================================================

// Chunked Base64 Encoding for large payloads
function uint8ToBase64(bytes) {
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// UTF-8 Safe compression
function compressData(data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const bytes = new TextEncoder().encode(jsonStr);
  const compressed = pako.deflate(bytes, { level: 9 });
  return uint8ToBase64(compressed);
}

function decompressData(base64) {
  const compressed = base64ToUint8(base64);
  const decompressed = pako.inflate(compressed);
  return new TextDecoder().decode(decompressed);
}

// Clipboard fallback for non-secure contexts
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

JSEOF

# Add original application code
echo "  Adding application code..."
tail -n +299 index.html >> "$OUTPUT"

echo ""
echo "✅ Build complete: $OUTPUT"
echo "📊 Size: $(ls -lh $OUTPUT | awk '{print $5}')"
echo ""
echo "Self-contained features:"
echo "  ✓ All libraries inlined (Cytoscape, Dagre, Pako)"
echo "  ✓ System fonts (no CDN)"
echo "  ✓ UTF-8 safe compression"
echo "  ✓ Chunked base64 encoding"
echo "  ✓ Clipboard fallback"
