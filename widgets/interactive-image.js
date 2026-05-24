// interactive-image.js
// AnyWidget that replicates notebooks/01.interactive_image.ipynb without a kernel.
//
// Loads a uint16-quantized image stack (produced by scripts/prep_widget_data.py)
// plus a JSON sidecar, and renders it with colormap / vmin-vmax / frame controls.
//
// Shadow-DOM safe:
//   - all DOM queries are scoped to `el`
//   - the only `document.*` calls are `document.createElement` (creates detached node)
//   - no window/document event listeners; CSS injected as a <style> child of `el`
//   - unique per-instance ID prefix for class names to avoid CSS collisions
//
// Pure ESM module, no dependencies. Embed via MyST:
//
//     :::{any:bundle} ./widgets/interactive-image.js
//     {
//       "data_url": "./widgets/data/interactive_image.bin",
//       "meta_url": "./widgets/data/interactive_image.json"
//     }
//     :::

// ============================================================
// Colormap LUTs (generated from matplotlib; 256 RGB triplets each)
// ============================================================
const COLORMAPS = {
  gray: new Uint8Array([0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,12,13,13,13,14,14,14,15,15,15,16,16,16,17,17,17,18,18,18,19,19,19,20,20,20,21,21,21,22,22,22,23,23,23,24,24,24,25,25,25,26,26,26,27,27,27,28,28,28,29,29,29,30,30,30,31,31,31,32,32,32,33,33,33,34,34,34,35,35,35,36,36,36,37,37,37,38,38,38,39,39,39,40,40,40,41,41,41,42,42,42,43,43,43,44,44,44,45,45,45,46,46,46,47,47,47,48,48,48,49,49,49,50,50,50,51,51,51,52,52,52,53,53,53,54,54,54,55,55,55,56,56,56,57,57,57,58,58,58,59,59,59,60,60,60,61,61,61,62,62,62,63,63,63,64,64,64,65,65,65,66,66,66,67,67,67,68,68,68,69,69,69,70,70,70,71,71,71,72,72,72,73,73,73,74,74,74,75,75,75,76,76,76,77,77,77,78,78,78,79,79,79,80,80,80,81,81,81,82,82,82,83,83,83,84,84,84,85,85,85,86,86,86,87,87,87,88,88,88,89,89,89,90,90,90,91,91,91,92,92,92,93,93,93,94,94,94,95,95,95,96,96,96,97,97,97,98,98,98,99,99,99,100,100,100,101,101,101,102,102,102,103,103,103,104,104,104,105,105,105,106,106,106,107,107,107,108,108,108,109,109,109,110,110,110,111,111,111,112,112,112,113,113,113,114,114,114,115,115,115,116,116,116,117,117,117,118,118,118,119,119,119,120,120,120,121,121,121,122,122,122,123,123,123,124,124,124,125,125,125,126,126,126,127,127,127,128,128,128,129,129,129,130,130,130,131,131,131,132,132,132,133,133,133,134,134,134,135,135,135,136,136,136,137,137,137,138,138,138,139,139,139,140,140,140,141,141,141,142,142,142,143,143,143,144,144,144,145,145,145,146,146,146,147,147,147,148,148,148,149,149,149,150,150,150,151,151,151,152,152,152,153,153,153,154,154,154,155,155,155,156,156,156,157,157,157,158,158,158,159,159,159,160,160,160,161,161,161,162,162,162,163,163,163,164,164,164,165,165,165,166,166,166,167,167,167,168,168,168,169,169,169,170,170,170,171,171,171,172,172,172,173,173,173,174,174,174,175,175,175,176,176,176,177,177,177,178,178,178,179,179,179,180,180,180,181,181,181,182,182,182,183,183,183,184,184,184,185,185,185,186,186,186,187,187,187,188,188,188,189,189,189,190,190,190,191,191,191,192,192,192,193,193,193,194,194,194,195,195,195,196,196,196,197,197,197,198,198,198,199,199,199,200,200,200,201,201,201,202,202,202,203,203,203,204,204,204,205,205,205,206,206,206,207,207,207,208,208,208,209,209,209,210,210,210,211,211,211,212,212,212,213,213,213,214,214,214,215,215,215,216,216,216,217,217,217,218,218,218,219,219,219,220,220,220,221,221,221,222,222,222,223,223,223,224,224,224,225,225,225,226,226,226,227,227,227,228,228,228,229,229,229,230,230,230,231,231,231,232,232,232,233,233,233,234,234,234,235,235,235,236,236,236,237,237,237,238,238,238,239,239,239,240,240,240,241,241,241,242,242,242,243,243,243,244,244,244,245,245,245,246,246,246,247,247,247,248,248,248,249,249,249,250,250,250,251,251,251,252,252,252,253,253,253,254,254,254,255,255,255]),
  viridis: new Uint8Array([68,1,84,68,2,86,69,4,87,69,5,89,70,7,90,70,8,92,70,10,93,70,11,94,71,13,96,71,14,97,71,16,99,71,17,100,71,19,101,72,20,103,72,22,104,72,23,105,72,24,106,72,26,108,72,27,109,72,28,110,72,29,111,72,31,112,72,32,113,72,33,115,72,35,116,72,36,117,72,37,118,72,38,119,72,40,120,72,41,121,71,42,122,71,44,122,71,45,123,71,46,124,71,47,125,70,48,126,70,50,126,70,51,127,70,52,128,69,53,129,69,55,129,69,56,130,68,57,131,68,58,131,68,59,132,67,61,132,67,62,133,66,63,133,66,64,134,66,65,134,65,66,135,65,68,135,64,69,136,64,70,136,63,71,136,63,72,137,62,73,137,62,74,137,62,76,138,61,77,138,61,78,138,60,79,138,60,80,139,59,81,139,59,82,139,58,83,139,58,84,140,57,85,140,57,86,140,56,88,140,56,89,140,55,90,140,55,91,141,54,92,141,54,93,141,53,94,141,53,95,141,52,96,141,52,97,141,51,98,141,51,99,141,50,100,142,50,101,142,49,102,142,49,103,142,49,104,142,48,105,142,48,106,142,47,107,142,47,108,142,46,109,142,46,110,142,46,111,142,45,112,142,45,113,142,44,113,142,44,114,142,44,115,142,43,116,142,43,117,142,42,118,142,42,119,142,42,120,142,41,121,142,41,122,142,41,123,142,40,124,142,40,125,142,39,126,142,39,127,142,39,128,142,38,129,142,38,130,142,38,130,142,37,131,142,37,132,142,37,133,142,36,134,142,36,135,142,35,136,142,35,137,142,35,138,141,34,139,141,34,140,141,34,141,141,33,142,141,33,143,141,33,144,141,33,145,140,32,146,140,32,146,140,32,147,140,31,148,140,31,149,139,31,150,139,31,151,139,31,152,139,31,153,138,31,154,138,30,155,138,30,156,137,30,157,137,31,158,137,31,159,136,31,160,136,31,161,136,31,161,135,31,162,135,32,163,134,32,164,134,33,165,133,33,166,133,34,167,133,34,168,132,35,169,131,36,170,131,37,171,130,37,172,130,38,173,129,39,173,129,40,174,128,41,175,127,42,176,127,44,177,126,45,178,125,46,179,124,47,180,124,49,181,123,50,182,122,52,182,121,53,183,121,55,184,120,56,185,119,58,186,118,59,187,117,61,188,116,63,188,115,64,189,114,66,190,113,68,191,112,70,192,111,72,193,110,74,193,109,76,194,108,78,195,107,80,196,106,82,197,105,84,197,104,86,198,103,88,199,101,90,200,100,92,200,99,94,201,98,96,202,96,99,203,95,101,203,94,103,204,92,105,205,91,108,205,90,110,206,88,112,207,87,115,208,86,117,208,84,119,209,83,122,209,81,124,210,80,127,211,78,129,211,77,132,212,75,134,213,73,137,213,72,139,214,70,142,214,69,144,215,67,147,215,65,149,216,64,152,216,62,155,217,60,157,217,59,160,218,57,162,218,55,165,219,54,168,219,52,170,220,50,173,220,48,176,221,47,178,221,45,181,222,43,184,222,41,186,222,40,189,223,38,192,223,37,194,223,35,197,224,33,200,224,32,202,225,31,205,225,29,208,225,28,210,226,27,213,226,26,216,226,25,218,227,25,221,227,24,223,227,24,226,228,24,229,228,25,231,228,25,234,229,26,236,229,27,239,229,28,241,229,29,244,230,30,246,230,32,248,230,33,251,231,35,253,231,37]),
  plasma: new Uint8Array([13,8,135,16,7,136,19,7,137,22,7,138,25,6,140,27,6,141,29,6,142,32,6,143,34,6,144,36,6,145,38,5,145,40,5,146,42,5,147,44,5,148,46,5,149,47,5,150,49,5,151,51,5,151,53,4,152,55,4,153,56,4,154,58,4,154,60,4,155,62,4,156,63,4,156,65,4,157,67,3,158,68,3,158,70,3,159,72,3,159,73,3,160,75,3,161,76,2,161,78,2,162,80,2,162,81,2,163,83,2,163,85,2,164,86,1,164,88,1,164,89,1,165,91,1,165,92,1,166,94,1,166,96,1,166,97,0,167,99,0,167,100,0,167,102,0,167,103,0,168,105,0,168,106,0,168,108,0,168,110,0,168,111,0,168,113,0,168,114,1,168,116,1,168,117,1,168,119,1,168,120,1,168,122,2,168,123,2,168,125,3,168,126,3,168,128,4,168,129,4,167,131,5,167,132,5,167,134,6,166,135,7,166,136,8,166,138,9,165,139,10,165,141,11,165,142,12,164,143,13,164,145,14,163,146,15,163,148,16,162,149,17,161,150,19,161,152,20,160,153,21,159,154,22,159,156,23,158,157,24,157,158,25,157,160,26,156,161,27,155,162,29,154,163,30,154,165,31,153,166,32,152,167,33,151,168,34,150,170,35,149,171,36,148,172,38,148,173,39,147,174,40,146,176,41,145,177,42,144,178,43,143,179,44,142,180,46,141,181,47,140,182,48,139,183,49,138,184,50,137,186,51,136,187,52,136,188,53,135,189,55,134,190,56,133,191,57,132,192,58,131,193,59,130,194,60,129,195,61,128,196,62,127,197,64,126,198,65,125,199,66,124,200,67,123,201,68,122,202,69,122,203,70,121,204,71,120,204,73,119,205,74,118,206,75,117,207,76,116,208,77,115,209,78,114,210,79,113,211,81,113,212,82,112,213,83,111,213,84,110,214,85,109,215,86,108,216,87,107,217,88,106,218,90,106,218,91,105,219,92,104,220,93,103,221,94,102,222,95,101,222,97,100,223,98,99,224,99,99,225,100,98,226,101,97,226,102,96,227,104,95,228,105,94,229,106,93,229,107,93,230,108,92,231,110,91,231,111,90,232,112,89,233,113,88,233,114,87,234,116,87,235,117,86,235,118,85,236,119,84,237,121,83,237,122,82,238,123,81,239,124,81,239,126,80,240,127,79,240,128,78,241,129,77,241,131,76,242,132,75,243,133,75,243,135,74,244,136,73,244,137,72,245,139,71,245,140,70,246,141,69,246,143,68,247,144,68,247,145,67,247,147,66,248,148,65,248,149,64,249,151,63,249,152,62,249,154,62,250,155,61,250,156,60,250,158,59,251,159,58,251,161,57,251,162,56,252,163,56,252,165,55,252,166,54,252,168,53,252,169,52,253,171,51,253,172,51,253,174,50,253,175,49,253,177,48,253,178,47,253,180,47,253,181,46,254,183,45,254,184,44,254,186,44,254,187,43,254,189,42,254,190,42,254,192,41,253,194,41,253,195,40,253,197,39,253,198,39,253,200,39,253,202,38,253,203,38,252,205,37,252,206,37,252,208,37,252,210,37,251,211,36,251,213,36,251,215,36,250,216,36,250,218,36,249,220,36,249,221,37,248,223,37,248,225,37,247,226,37,247,228,37,246,230,38,246,232,38,245,233,38,245,235,39,244,237,39,243,238,39,243,240,39,242,242,39,241,244,38,241,245,37,240,247,36,240,249,33]),
  inferno: new Uint8Array([0,0,4,1,0,5,1,1,6,1,1,8,2,1,10,2,2,12,2,2,14,3,2,16,4,3,18,4,3,20,5,4,23,6,4,25,7,5,27,8,5,29,9,6,31,10,7,34,11,7,36,12,8,38,13,8,41,14,9,43,16,9,45,17,10,48,18,10,50,20,11,52,21,11,55,22,11,57,24,12,60,25,12,62,27,12,65,28,12,67,30,12,69,31,12,72,33,12,74,35,12,76,36,12,79,38,12,81,40,11,83,41,11,85,43,11,87,45,11,89,47,10,91,49,10,92,50,10,94,52,10,95,54,9,97,56,9,98,57,9,99,59,9,100,61,9,101,62,9,102,64,10,103,66,10,104,68,10,104,69,10,105,71,11,106,73,11,106,74,12,107,76,12,107,77,13,108,79,13,108,81,14,108,82,14,109,84,15,109,85,15,109,87,16,110,89,16,110,90,17,110,92,18,110,93,18,110,95,19,110,97,19,110,98,20,110,100,21,110,101,21,110,103,22,110,105,22,110,106,23,110,108,24,110,109,24,110,111,25,110,113,25,110,114,26,110,116,26,110,117,27,110,119,28,109,120,28,109,122,29,109,124,29,109,125,30,109,127,30,108,128,31,108,130,32,108,132,32,107,133,33,107,135,33,107,136,34,106,138,34,106,140,35,105,141,35,105,143,36,105,144,37,104,146,37,104,147,38,103,149,38,103,151,39,102,152,39,102,154,40,101,155,41,100,157,41,100,159,42,99,160,42,99,162,43,98,163,44,97,165,44,96,166,45,96,168,46,95,169,46,94,171,47,94,173,48,93,174,48,92,176,49,91,177,50,90,179,50,90,180,51,89,182,52,88,183,53,87,185,53,86,186,54,85,188,55,84,189,56,83,191,57,82,192,58,81,193,58,80,195,59,79,196,60,78,198,61,77,199,62,76,200,63,75,202,64,74,203,65,73,204,66,72,206,67,71,207,68,70,208,69,69,210,70,68,211,71,67,212,72,66,213,74,65,215,75,63,216,76,62,217,77,61,218,78,60,219,80,59,221,81,58,222,82,56,223,83,55,224,85,54,225,86,53,226,87,52,227,89,51,228,90,49,229,92,48,230,93,47,231,94,46,232,96,45,233,97,43,234,99,42,235,100,41,235,102,40,236,103,38,237,105,37,238,106,36,239,108,35,239,110,33,240,111,32,241,113,31,241,115,29,242,116,28,243,118,27,243,120,25,244,121,24,245,123,23,245,125,21,246,126,20,246,128,19,247,130,18,247,132,16,248,133,15,248,135,14,248,137,12,249,139,11,249,140,10,249,142,9,250,144,8,250,146,7,250,148,7,251,150,6,251,151,6,251,153,6,251,155,6,251,157,7,252,159,7,252,161,8,252,163,9,252,165,10,252,166,12,252,168,13,252,170,15,252,172,17,252,174,18,252,176,20,252,178,22,252,180,24,251,182,26,251,184,29,251,186,31,251,188,33,251,190,35,250,192,38,250,194,40,250,196,42,250,198,45,249,199,47,249,201,50,249,203,53,248,205,55,248,207,58,247,209,61,247,211,64,246,213,67,246,215,70,245,217,73,245,219,76,244,221,79,244,223,83,244,225,86,243,227,90,243,229,93,242,230,97,242,232,101,242,234,105,241,236,109,241,237,113,241,239,117,241,241,121,242,242,125,242,244,130,243,245,134,243,246,138,244,248,142,245,249,146,246,250,150,248,251,154,249,252,157,250,253,161,252,255,164]),
  magma: new Uint8Array([0,0,4,1,0,5,1,1,6,1,1,8,2,1,9,2,2,11,2,2,13,3,3,15,3,3,18,4,4,20,5,4,22,6,5,24,6,5,26,7,6,28,8,7,30,9,7,32,10,8,34,11,9,36,12,9,38,13,10,41,14,11,43,16,11,45,17,12,47,18,13,49,19,13,52,20,14,54,21,14,56,22,15,59,24,15,61,25,16,63,26,16,66,28,16,68,29,17,71,30,17,73,32,17,75,33,17,78,34,17,80,36,18,83,37,18,85,39,18,88,41,17,90,42,17,92,44,17,95,45,17,97,47,17,99,49,17,101,51,16,103,52,16,105,54,16,107,56,16,108,57,15,110,59,15,112,61,15,113,63,15,114,64,15,116,66,15,117,68,15,118,69,16,119,71,16,120,73,16,120,74,16,121,76,17,122,78,17,123,79,18,123,81,18,124,82,19,124,84,19,125,86,20,125,87,21,126,89,21,126,90,22,126,92,22,127,93,23,127,95,24,127,96,24,128,98,25,128,100,26,128,101,26,128,103,27,128,104,28,129,106,28,129,107,29,129,109,29,129,110,30,129,112,31,129,114,31,129,115,32,129,117,33,129,118,33,129,120,34,129,121,34,130,123,35,130,124,35,130,126,36,130,128,37,130,129,37,129,131,38,129,132,38,129,134,39,129,136,39,129,137,40,129,139,41,129,140,41,129,142,42,129,144,42,129,145,43,129,147,43,128,148,44,128,150,44,128,152,45,128,153,45,128,155,46,127,156,46,127,158,47,127,160,47,127,161,48,126,163,48,126,165,49,126,166,49,125,168,50,125,170,51,125,171,51,124,173,52,124,174,52,123,176,53,123,178,53,123,179,54,122,181,54,122,183,55,121,184,55,121,186,56,120,188,57,120,189,57,119,191,58,119,192,58,118,194,59,117,196,60,117,197,60,116,199,61,115,200,62,115,202,62,114,204,63,113,205,64,113,207,64,112,208,65,111,210,66,111,211,67,110,213,68,109,214,69,108,216,69,108,217,70,107,219,71,106,220,72,105,222,73,104,223,74,104,224,76,103,226,77,102,227,78,101,228,79,100,229,80,100,231,82,99,232,83,98,233,84,98,234,86,97,235,87,96,236,88,96,237,90,95,238,91,94,239,93,94,240,95,94,241,96,93,242,98,93,242,100,92,243,101,92,244,103,92,244,105,92,245,107,92,246,108,92,246,110,92,247,112,92,247,114,92,248,116,92,248,118,92,249,120,93,249,121,93,249,123,93,250,125,94,250,127,94,250,129,95,251,131,95,251,133,96,251,135,97,252,137,97,252,138,98,252,140,99,252,142,100,252,144,101,253,146,102,253,148,103,253,150,104,253,152,105,253,154,106,253,155,107,254,157,108,254,159,109,254,161,110,254,163,111,254,165,113,254,167,114,254,169,115,254,170,116,254,172,118,254,174,119,254,176,120,254,178,122,254,180,123,254,182,124,254,183,126,254,185,127,254,187,129,254,189,130,254,191,132,254,193,133,254,194,135,254,196,136,254,198,138,254,200,140,254,202,141,254,204,143,254,205,144,254,207,146,254,209,148,254,211,149,254,213,151,254,215,153,254,216,154,253,218,156,253,220,158,253,222,160,253,224,161,253,226,163,253,227,165,253,229,167,253,231,169,253,233,170,253,235,172,252,236,174,252,238,176,252,240,178,252,242,180,252,244,182,252,246,184,252,247,185,252,249,187,252,251,189,252,253,191]),
  cividis: new Uint8Array([0,34,78,0,35,79,0,36,81,0,37,83,0,37,84,0,38,86,0,39,88,0,40,89,0,40,91,0,41,93,0,42,95,0,42,97,0,43,98,0,44,100,0,44,102,0,45,104,0,46,106,0,46,108,0,47,109,0,48,111,0,48,112,0,49,112,0,49,113,1,50,113,5,51,113,8,51,112,12,52,112,15,53,112,18,53,112,20,54,112,22,55,112,24,55,111,26,56,111,28,57,111,30,58,111,32,58,111,33,59,110,35,60,110,36,60,110,38,61,110,39,62,110,41,63,110,42,63,109,43,64,109,45,65,109,46,65,109,47,66,109,49,67,109,50,67,109,51,68,109,52,69,108,53,69,108,54,70,108,56,71,108,57,72,108,58,72,108,59,73,108,60,74,108,61,74,108,62,75,108,63,76,108,64,76,108,65,77,108,66,78,108,67,78,108,68,79,108,69,80,108,70,81,108,71,81,108,72,82,108,73,83,108,74,83,108,75,84,108,76,85,108,77,85,108,78,86,108,79,87,108,80,87,108,81,88,109,82,89,109,83,90,109,84,90,109,85,91,109,85,92,109,86,92,109,87,93,109,88,94,109,89,94,110,90,95,110,91,96,110,92,97,110,93,97,110,94,98,110,94,99,111,95,99,111,96,100,111,97,101,111,98,101,111,99,102,112,100,103,112,101,104,112,101,104,112,102,105,112,103,106,113,104,106,113,105,107,113,106,108,113,107,109,114,108,109,114,108,110,114,109,111,114,110,111,115,111,112,115,112,113,115,113,114,116,114,114,116,114,115,116,115,116,117,116,116,117,117,117,117,118,118,118,119,119,118,119,119,119,120,120,119,121,121,119,122,122,120,123,122,120,124,123,120,125,124,120,126,124,120,126,125,120,127,126,120,128,127,120,129,127,120,130,128,121,131,129,121,132,130,121,133,130,121,134,131,121,135,132,120,136,133,120,137,133,120,138,134,120,139,135,120,140,136,120,141,136,120,142,137,120,143,138,120,144,139,120,145,139,120,146,140,120,146,141,120,147,142,120,148,142,119,149,143,119,150,144,119,151,145,119,152,146,119,153,146,119,154,147,118,155,148,118,156,149,118,157,149,118,158,150,118,159,151,117,160,152,117,161,153,117,162,153,117,163,154,116,164,155,116,165,156,116,166,156,116,167,157,115,168,158,115,169,159,115,170,160,115,171,160,114,172,161,114,173,162,114,174,163,113,175,164,113,176,165,113,177,165,112,179,166,112,180,167,111,181,168,111,182,169,111,183,169,110,184,170,110,185,171,109,186,172,109,187,173,109,188,174,108,189,174,108,190,175,107,191,176,107,192,177,106,193,178,106,194,179,105,195,179,105,196,180,104,197,181,104,198,182,103,199,183,103,200,184,102,201,185,101,203,185,101,204,186,100,205,187,99,206,188,99,207,189,98,208,190,98,209,191,97,210,192,96,211,192,95,212,193,95,213,194,94,214,195,93,215,196,92,217,197,92,218,198,91,219,199,90,220,200,89,221,200,88,222,201,88,223,202,87,224,203,86,225,204,85,226,205,84,228,206,83,229,207,82,230,208,81,231,209,80,232,210,79,233,211,78,234,211,76,235,212,75,237,213,74,238,214,73,239,215,72,240,216,70,241,217,69,242,218,68,243,219,66,245,220,65,246,221,63,247,222,62,248,223,60,249,224,58,251,225,56,252,226,54,253,227,52,254,228,52,254,229,53,254,230,54,254,232,56]),
  turbo: new Uint8Array([48,18,59,50,21,67,51,24,74,52,27,81,53,30,88,54,33,95,55,36,102,56,39,109,57,42,115,58,45,121,59,47,128,60,50,134,61,53,139,62,56,145,63,59,151,63,62,156,64,64,162,65,67,167,65,70,172,66,73,177,66,75,181,67,78,186,68,81,191,68,84,195,68,86,199,69,89,203,69,92,207,69,94,211,70,97,214,70,100,218,70,102,221,70,105,224,70,107,227,71,110,230,71,113,233,71,115,235,71,118,238,71,120,240,71,123,242,70,125,244,70,128,246,70,130,248,70,133,250,70,135,251,69,138,252,69,140,253,68,143,254,67,145,254,66,148,255,65,150,255,64,153,255,62,155,254,61,158,254,59,160,253,58,163,252,56,165,251,55,168,250,53,171,248,51,173,247,49,175,245,47,178,244,46,180,242,44,183,240,42,185,238,40,188,235,39,190,233,37,192,231,35,195,228,34,197,226,32,199,223,31,201,221,30,203,218,28,205,216,27,208,213,26,210,210,26,212,208,25,213,205,24,215,202,24,217,200,24,219,197,24,221,194,24,222,192,24,224,189,25,226,187,25,227,185,26,228,182,28,230,180,29,231,178,31,233,175,32,234,172,34,235,170,37,236,167,39,238,164,42,239,161,44,240,158,47,241,155,50,242,152,53,243,148,56,244,145,60,245,142,63,246,138,67,247,135,70,248,132,74,248,128,78,249,125,82,250,122,85,250,118,89,251,115,93,252,111,97,252,108,101,253,105,105,253,102,109,254,98,113,254,95,117,254,92,121,254,89,125,255,86,128,255,83,132,255,81,136,255,78,139,255,75,143,255,73,146,255,71,150,254,68,153,254,66,156,254,64,159,253,63,161,253,61,164,252,60,167,252,58,169,251,57,172,251,56,175,250,55,177,249,54,180,248,54,183,247,53,185,246,53,188,245,52,190,244,52,193,243,52,195,241,52,198,240,52,200,239,52,203,237,52,205,236,52,208,234,52,210,233,53,212,231,53,215,229,53,217,228,54,219,226,54,221,224,55,223,223,55,225,221,55,227,219,56,229,217,56,231,215,57,233,213,57,235,211,57,236,209,58,238,207,58,239,205,58,241,203,58,242,201,58,244,199,58,245,197,58,246,195,58,247,193,58,248,190,57,249,188,57,250,186,57,251,184,56,251,182,55,252,179,54,252,177,54,253,174,53,253,172,52,254,169,51,254,167,50,254,164,49,254,161,48,254,158,47,254,155,45,254,153,44,254,150,43,254,147,42,254,144,41,253,141,39,253,138,38,252,135,37,252,132,35,251,129,34,251,126,33,250,123,31,249,120,30,249,117,29,248,114,28,247,111,26,246,108,25,245,105,24,244,102,23,243,99,21,242,96,20,241,93,19,240,91,18,239,88,17,237,85,16,236,83,15,235,80,14,234,78,13,232,75,12,231,73,12,229,71,11,228,69,10,226,67,10,225,65,9,223,63,8,221,61,8,220,59,7,218,57,7,216,55,6,214,53,6,212,51,5,210,49,5,208,47,5,206,45,4,204,43,4,202,42,4,200,40,3,197,38,3,195,37,3,193,35,2,190,33,2,188,32,2,185,30,2,183,29,2,180,27,1,178,26,1,175,24,1,172,23,1,169,22,1,167,20,1,164,19,1,161,18,1,158,16,1,155,15,1,152,14,1,149,13,1,146,11,1,142,10,1,139,9,2,136,8,2,133,7,2,129,6,2,126,5,2,122,4,3]),
};
const COLORMAP_NAMES = Object.keys(COLORMAPS);

// ============================================================
// Data loading
// ============================================================
async function loadData(dataUrl, metaUrl) {
  const [binRes, metaRes] = await Promise.all([fetch(dataUrl), fetch(metaUrl)]);
  if (!binRes.ok) throw new Error(`Failed to fetch ${dataUrl}: ${binRes.status}`);
  if (!metaRes.ok) throw new Error(`Failed to fetch ${metaUrl}: ${metaRes.status}`);
  const buf = await binRes.arrayBuffer();
  const meta = await metaRes.json();
  const [n, H, W] = meta.shape;
  const all = new Uint16Array(buf);
  // Slice per-frame views (no copy) and remember per-frame de-quantization range.
  const frames = [];
  for (let i = 0; i < n; i++) {
    const u16 = all.subarray(i * H * W, (i + 1) * H * W);
    const { vmin, vmax, label, mean, std } = meta.frames[i];
    // Precompute a histogram in 100 bins from the stored uint16 (much faster
    // than reconstructing float for every pixel).
    const nBins = 100;
    const hist = new Float32Array(nBins);
    for (let j = 0; j < u16.length; j++) {
      const b = Math.min(nBins - 1, Math.floor((u16[j] / 65535) * nBins));
      hist[b]++;
    }
    let hmax = 0;
    for (let b = 0; b < nBins; b++) if (hist[b] > hmax) hmax = hist[b];
    for (let b = 0; b < nBins; b++) hist[b] /= hmax;
    frames.push({ u16, H, W, vmin, vmax, mean, std, label, hist, nBins });
  }
  return { frames, meta };
}

// ============================================================
// Rendering
// ============================================================
// Render at full source resolution into an offscreen canvas. Pan/zoom in the
// viewer then becomes a cheap `drawImage(offscreen, srcRect, dstRect)` call
// rather than recomputing the colormap on every interaction.
function renderToOffscreen(canvas, frame, displayVmin, displayVmax, cmapName) {
  const { u16, H, W, vmin, vmax } = frame;
  const cmap = COLORMAPS[cmapName] || COLORMAPS.gray;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(W, H);
  const px = img.data;
  // Pre-derive: stored uint16 v -> float = vmin + (v / 65535) * (vmax - vmin).
  // Then map to [0,1] via (float - displayVmin) / (displayVmax - displayVmin).
  // Combine: t = (vmin + (v / 65535) * (vmax - vmin) - displayVmin) / (displayVmax - displayVmin)
  //        = a + b * v   where:
  const span = vmax - vmin;
  const displaySpan = displayVmax - displayVmin || 1;
  const a = (vmin - displayVmin) / displaySpan;
  const b = (span / 65535) / displaySpan;

  for (let i = 0, j = 0; i < u16.length; i++, j += 4) {
    let t = a + b * u16[i];
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const c = (t * 255) | 0;
    const o = c * 3;
    px[j] = cmap[o];
    px[j + 1] = cmap[o + 1];
    px[j + 2] = cmap[o + 2];
    px[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function renderHistogram(canvas, frame, displayVmin, displayVmax, cmapName) {
  // Draw a histogram with each bar colored by where it falls in the current
  // [displayVmin, displayVmax] window. Bars *outside* the window are clamped
  // to the colormap's first / last colour (matplotlib's under/over behaviour),
  // so they read as "below threshold" / "above threshold" rather than a
  // disconnected gray band. The two vertical lines are draggable handles
  // (drag logic lives on the canvas's pointer handlers, not in this function).
  const { hist, nBins, vmin, vmax } = frame;
  const cmap = COLORMAPS[cmapName] || COLORMAPS.gray;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(191,191,191)";
  ctx.fillRect(0, 0, W, H);

  const span = vmax - vmin;
  const displaySpan = displayVmax - displayVmin || 1;
  const barWidth = W / nBins;
  for (let b = 0; b < nBins; b++) {
    const bcenter = vmin + ((b + 0.5) / nBins) * span;
    const t = (bcenter - displayVmin) / displaySpan;
    const c = Math.max(0, Math.min(255, (t * 255) | 0));  // clamp -> under/over saturate
    const o = c * 3;
    ctx.fillStyle = `rgb(${cmap[o]},${cmap[o + 1]},${cmap[o + 2]})`;
    const barH = hist[b] * H * 0.95;
    ctx.fillRect(b * barWidth, H - barH, barWidth + 1, barH);
  }

  // Window handles: thick vertical lines drawn in the *opposite* colour so
  // they're visible against the bars they sit on.
  if (span > 0) {
    const xMin = ((displayVmin - vmin) / span) * W;
    const xMax = ((displayVmax - vmin) / span) * W;
    ctx.lineWidth = 2;
    // Min handle: drawn in the colormap's max colour (contrasts with min-end bars)
    ctx.strokeStyle = `rgb(${cmap[765]},${cmap[766]},${cmap[767]})`;
    ctx.beginPath(); ctx.moveTo(xMin, 0); ctx.lineTo(xMin, H); ctx.stroke();
    // Max handle: drawn in the colormap's min colour (contrasts with max-end bars)
    ctx.strokeStyle = `rgb(${cmap[0]},${cmap[1]},${cmap[2]})`;
    ctx.beginPath(); ctx.moveTo(xMax, 0); ctx.lineTo(xMax, H); ctx.stroke();
  }
}

// ============================================================
// Main render
// ============================================================
// Read a model value across the various `model` shapes the MyST/anywidget
// runtime might hand us:
//   - the canonical anywidget Model with `.get(key)`
//   - a plain JS object `{key: value}` (some renderers pass the model body verbatim)
function modelGet(model, key, fallback) {
  if (!model) return fallback;
  if (typeof model.get === "function") {
    const v = model.get(key);
    return v === undefined ? fallback : v;
  }
  return model[key] !== undefined ? model[key] : fallback;
}

function render({ model, el }) {
  const dataUrl = modelGet(model, "data_url", "./widgets/data/interactive_image.bin");
  const metaUrl = modelGet(model, "meta_url", "./widgets/data/interactive_image.json");
  const id = "iim_" + Math.random().toString(36).slice(2, 8);

  el.innerHTML = `
    <style>
      /* Labels use a medium gray that reads well on both light and dark
         backgrounds; section headers go a bit darker so they stand out. */
      .${id}-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #888; font-size: 13px; line-height: 1.4; }
      /* Sized to fit a ~700 px article column: 440 + 12 + 42 + 12 + 190 = 696 */
      .${id}-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
      .${id}-img-box { position: relative; background: #fff; border-radius: 6px; width: 440px; height: 440px; touch-action: none; user-select: none; flex-shrink: 0; }
      .${id}-img-canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; cursor: crosshair; border-radius: 6px; }
      .${id}-controls { display: flex; flex-direction: column; gap: 12px; width: 190px; flex-shrink: 0; }
      .${id}-section-label { font-weight: 600; font-size: 11px; color: #888; letter-spacing: 0.02em; }
      .${id}-hist-canvas { display: block; width: 190px; height: 80px; background: rgb(191,191,191); border-radius: 4px; margin: 2px 0; cursor: ew-resize; touch-action: none; }
      .${id}-hist-values { display: flex; justify-content: space-between; font-size: 11px; font-variant-numeric: tabular-nums; color: #888; }
      .${id}-hist-values .${id}-val { color: currentColor; font-weight: 500; }
      .${id}-ctrl { display: flex; flex-direction: column; gap: 3px; }
      .${id}-ctrl select { padding: 3px 5px; font-size: 12px; border: 1px solid #bbb; border-radius: 4px; background: transparent; color: inherit; }
      .${id}-ctrl-inline { display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; color: #888; }
      .${id}-loading { padding: 20px; color: #888; font-size: 13px; }
      .${id}-scalebar { position: absolute; left: 5%; bottom: 7%; height: 5px; background: #fff; box-shadow: 0 0 2px rgba(0,0,0,0.6); border-radius: 1px; pointer-events: none; }
      .${id}-scalebar-label { position: absolute; left: 5%; bottom: calc(7% + 9px); color: #fff; text-shadow: 0 0 3px #000, 0 0 3px #000; font-size: 12px; font-weight: 600; pointer-events: none; }
      /* Overlay controls on the image canvas */
      .${id}-reset { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.55); color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; font-family: inherit; }
      .${id}-reset:hover { background: rgba(0,0,0,0.75); }
      .${id}-help-wrap { position: absolute; bottom: 8px; right: 8px; }
      .${id}-help-btn { background: rgba(0,0,0,0.55); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: help; user-select: none; }
      .${id}-help-tip { display: none; position: absolute; bottom: calc(100% + 6px); right: 0; background: rgba(0,0,0,0.92); color: #fff; padding: 10px 12px; border-radius: 4px; font-size: 12px; line-height: 1.6; width: 220px; white-space: normal; pointer-events: none; }
      .${id}-help-wrap:hover .${id}-help-tip { display: block; }
      .${id}-help-tip kbd { background: rgba(255,255,255,0.15); padding: 0 4px; border-radius: 2px; font-family: ui-monospace, monospace; font-size: 11px; }
      .${id}-meta { display: none; position: absolute; background: rgba(0,0,0,0.92); color: #fff; padding: 10px 12px; border-radius: 4px; font-size: 12px; line-height: 1.6; max-width: 280px; z-index: 10; pointer-events: auto; }
      .${id}-meta strong { color: #ffd; font-weight: 500; }
      .${id}-meta .${id}-meta-close { position: absolute; top: 2px; right: 6px; cursor: pointer; opacity: 0.7; }
      .${id}-meta .${id}-meta-close:hover { opacity: 1; }
      .${id}-img-box.${id}-pan-mode .${id}-img-canvas { cursor: grab; }
      .${id}-img-box.${id}-panning .${id}-img-canvas { cursor: grabbing; }
      .${id}-readout { display: none; position: absolute; background: rgba(0,0,0,0.85); color: #fff; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, monospace; pointer-events: none; white-space: nowrap; z-index: 11; }
      /* Colorbar with tick labels on the OUTSIDE edge (left of canvas).
         42 px column: ~26 px label + 4 px tick + 12 px canvas, right-aligned. */
      .${id}-colorbar-wrap { position: relative; height: 440px; width: 42px; flex-shrink: 0; }
      .${id}-colorbar-canvas { display: block; width: 12px; height: 100%; border-radius: 2px; position: absolute; right: 0; top: 0; }
      .${id}-cb-tick { position: absolute; right: 18px; font-size: 10px; color: #888; font-variant-numeric: tabular-nums; white-space: nowrap; line-height: 1; transform: translateY(-50%); text-align: right; }
      .${id}-cb-tick::before { content: ''; position: absolute; right: -5px; top: 50%; width: 4px; height: 1px; background: currentColor; }
    </style>
    <div class="${id}-wrap">
      <div class="${id}-loading">Loading image data…</div>
    </div>`;

  const wrap = el.querySelector(`.${id}-wrap`);

  loadData(dataUrl, metaUrl).then(({ frames, meta }) => {
    wrap.innerHTML = `
      <div class="${id}-row">
        <div class="${id}-colorbar-wrap">
          <canvas class="${id}-colorbar-canvas" width="12" height="440"></canvas>
        </div>
        <div class="${id}-img-box">
          <canvas class="${id}-img-canvas" width="440" height="440"></canvas>
          <div class="${id}-scalebar"></div>
          <div class="${id}-scalebar-label"></div>
          <button class="${id}-reset" type="button" title="Reset view, range, and colormap">Reset</button>
          <div class="${id}-help-wrap">
            <div class="${id}-help-btn">Controls</div>
            <div class="${id}-help-tip">
              <strong>Hover</strong>: pixel value readout<br>
              <strong>Left click</strong>: center view on click<br>
              <strong>Left drag</strong>: zoom to box (square)<br>
              <strong>Double click</strong>: reset everything<br>
              <strong>Middle drag</strong> or <kbd>Shift</kbd>+drag: pan<br>
              <strong>Wheel</strong>: zoom in / out<br>
              <strong>Right click</strong>: image metadata
            </div>
          </div>
          <div class="${id}-meta"></div>
          <div class="${id}-readout"></div>
        </div>
        <div class="${id}-controls">
          <div class="${id}-ctrl">
            <div class="${id}-section-label">Display range — drag handles</div>
            <canvas class="${id}-hist-canvas" width="190" height="80"></canvas>
            <div class="${id}-hist-values">
              <span>min: <span class="${id}-val ${id}-vmin-val"></span></span>
              <span>max: <span class="${id}-val ${id}-vmax-val"></span></span>
            </div>
          </div>
          <div class="${id}-ctrl">
            <div class="${id}-section-label">Frame</div>
            <select class="${id}-frame">${frames.map((f, i) => `<option value="${i}">${f.label}</option>`).join("")}</select>
          </div>
          <div class="${id}-ctrl">
            <div class="${id}-section-label">Colormap</div>
            <select class="${id}-cmap">${COLORMAP_NAMES.map(n => `<option value="${n}"${n === "gray" ? " selected" : ""}>${n}</option>`).join("")}</select>
          </div>
          <label class="${id}-ctrl-inline">
            <input class="${id}-scalebar-toggle" type="checkbox" checked /> Show scale bar
          </label>
        </div>
      </div>`;

    const $ = (sel) => wrap.querySelector(sel);
    const imgBox = $(`.${id}-img-box`);
    const imgCanvas = $(`.${id}-img-canvas`);
    const histCanvas = $(`.${id}-hist-canvas`);
    const vminVal = $(`.${id}-vmin-val`);
    const vmaxVal = $(`.${id}-vmax-val`);
    const frameSel = $(`.${id}-frame`);
    const cmapSel = $(`.${id}-cmap`);
    const scalebarToggle = $(`.${id}-scalebar-toggle`);
    const scalebarEl = $(`.${id}-scalebar`);
    const scalebarLabel = $(`.${id}-scalebar-label`);
    const resetBtn = $(`.${id}-reset`);
    const metaEl = $(`.${id}-meta`);
    const colorbarCanvas = $(`.${id}-colorbar-canvas`);
    const colorbarWrap = $(`.${id}-colorbar-wrap`);
    const readoutEl = $(`.${id}-readout`);

    let frameIdx = 0;
    let cmapName = "gray";

    // Per-frame display ranges (different physical units across phase vs
    // amplitude, so each frame remembers its own [vmin, vmax]).
    const frameRanges = frames.map((f) => ({
      vmin: f.mean - 1 * f.std,
      vmax: f.mean + 2 * f.std,
    }));
    // Single SHARED viewport across frames — toggling frames keeps the same
    // zoom/pan so phase vs amplitude can be compared at the same location.
    const view = { x0: 0, y0: 0, x1: frames[0].W, y1: frames[0].H };

    // Offscreen canvas with the full-resolution colormapped image. Recomputed
    // when frame / cmap / vmin / vmax change. Pan/zoom is then a cheap
    // drawImage(..., srcRect, dstRect) instead of remapping all 2M pixels.
    const offscreen = document.createElement("canvas");
    let offscreenKey = "";  // identifier for "what's currently in offscreen"

    function ensureOffscreen() {
      const f = frames[frameIdx];
      const r = frameRanges[frameIdx];
      const key = `${frameIdx}|${cmapName}|${r.vmin.toFixed(6)}|${r.vmax.toFixed(6)}`;
      if (key === offscreenKey) return;
      renderToOffscreen(offscreen, f, r.vmin, r.vmax, cmapName);
      offscreenKey = key;
    }

    function presentView() {
      const v = view;
      const ctx = imgCanvas.getContext("2d");
      const dw = imgCanvas.width, dh = imgCanvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, dw, dh);
      ctx.drawImage(offscreen, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0, 0, 0, dw, dh);
      drawZoomBox(ctx);
      updateScaleBar();
    }

    function drawZoomBox(ctx) {
      if (!zoomBox) return;
      const v = view;
      const dw = imgCanvas.width, dh = imgCanvas.height;
      const sw = v.x1 - v.x0, sh = v.y1 - v.y0;
      const dx0 = ((zoomBox.x0 - v.x0) / sw) * dw;
      const dy0 = ((zoomBox.y0 - v.y0) / sh) * dh;
      const dx1 = ((zoomBox.x1 - v.x0) / sw) * dw;
      const dy1 = ((zoomBox.y1 - v.y0) / sh) * dh;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 235, 50, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(Math.min(dx0, dx1), Math.min(dy0, dy1),
        Math.abs(dx1 - dx0), Math.abs(dy1 - dy0));
      ctx.restore();
    }

    function updateScaleBar() {
      const v = view;
      const viewWidthNm = (v.x1 - v.x0) * meta.pixel_size_nm;
      // Pick a "nice" 1/2/5 × 10ⁿ length close to ~15% of the visible width.
      // Mirrors how matplotlib picks axis tick spacings.
      const target = viewWidthNm * 0.15;
      const exponent = Math.floor(Math.log10(target));
      const mantissa = target / Math.pow(10, exponent);
      let niceMantissa;
      if (mantissa < 1.5)      niceMantissa = 1;
      else if (mantissa < 3.5) niceMantissa = 2;
      else if (mantissa < 7.5) niceMantissa = 5;
      else                     niceMantissa = 10;
      const lenNm = niceMantissa * Math.pow(10, exponent);
      const lenSrcPx = lenNm / meta.pixel_size_nm;
      const lenDispPx = (lenSrcPx / (v.x1 - v.x0)) * imgCanvas.clientWidth;
      scalebarEl.style.width = `${lenDispPx}px`;
      scalebarLabel.textContent = formatNmLength(lenNm);
    }

    function formatNmLength(v) {
      if (v >= 1)     return `${v.toFixed(0)} nm`;
      if (v >= 0.1)   return `${v.toFixed(1)} nm`;
      if (v >= 0.01)  return `${v.toFixed(2)} nm`;
      if (v >= 0.001) return `${v.toFixed(3)} nm`;
      return `${v.toExponential(0)} nm`;
    }

    // Compact number formatter for colorbar ticks: 2-3 sig figs with no
    // trailing zeros, falling back to scientific for very small / large values.
    function formatTickValue(v) {
      if (v === 0) return "0";
      const a = Math.abs(v);
      let s;
      if (a >= 100)      s = v.toFixed(0);
      else if (a >= 10)  s = v.toFixed(1);
      else if (a >= 1)   s = v.toFixed(2);
      else if (a >= 0.01) s = v.toFixed(3);
      else               return v.toExponential(1);
      if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
      if (s === "0" || s === "-0") return v.toExponential(1);
      return s;
    }

    function paint() {
      const f = frames[frameIdx];
      const r = frameRanges[frameIdx];
      // Clamp value range
      r.vmin = Math.max(f.vmin, Math.min(r.vmin, f.vmax));
      r.vmax = Math.max(f.vmin, Math.min(r.vmax, f.vmax));
      if (r.vmin >= r.vmax) r.vmin = r.vmax - (f.vmax - f.vmin) / 1000;
      vminVal.textContent = r.vmin.toFixed(4);
      vmaxVal.textContent = r.vmax.toFixed(4);
      ensureOffscreen();
      presentView();
      renderHistogram(histCanvas, f, r.vmin, r.vmax, cmapName);
      renderColorbar();
    }

    // -----------------------------------------------------------
    // Vertical colorbar with tick labels (top = vmax, bottom = vmin)
    // -----------------------------------------------------------
    function renderColorbar() {
      const cmap = COLORMAPS[cmapName] || COLORMAPS.gray;
      const r = frameRanges[frameIdx];
      const W = colorbarCanvas.width;
      const H = colorbarCanvas.height;
      const ctx = colorbarCanvas.getContext("2d");
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        const t = 1 - y / (H - 1);  // top row -> max
        const c = Math.max(0, Math.min(255, (t * 255) | 0));
        const o = c * 3;
        for (let x = 0; x < W; x++) {
          const k = (y * W + x) * 4;
          img.data[k] = cmap[o]; img.data[k + 1] = cmap[o + 1]; img.data[k + 2] = cmap[o + 2]; img.data[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      // Ticks: 5 evenly spaced labels positioned by % of height
      const nTicks = 5;
      const ticks = [];
      for (let i = 0; i < nTicks; i++) {
        const tt = i / (nTicks - 1);              // 0 at top -> 1 at bottom
        const value = r.vmax - tt * (r.vmax - r.vmin);
        const topPct = tt * 100;
        ticks.push(`<div class="${id}-cb-tick" style="top:${topPct}%">${formatTickValue(value)}</div>`);
      }
      // Rebuild tick spans (drop any old ones, keep canvas)
      const oldTicks = colorbarWrap.querySelectorAll(`.${id}-cb-tick`);
      oldTicks.forEach((n) => n.remove());
      colorbarWrap.insertAdjacentHTML("beforeend", ticks.join(""));
    }

    // -----------------------------------------------------------
    // Viewport pointer events
    //
    // Pixel-value readout: always visible while the cursor is over the image
    // (pointerenter -> pointermove -> pointerleave). Independent of clicks.
    //
    // Left button:
    //   click (no drag)  -> center view on click point (220 ms debounce so
    //                       a follow-up double-click can take over)
    //   drag (>= 4 px)   -> rubber-band zoom to box
    //   double-click     -> full reset (view + display range + colormap)
    //
    // Middle button or Shift+left -> pan. Wheel zooms. Right-click metadata.
    // -----------------------------------------------------------
    const DRAG_PX = 4;
    const CLICK_DEBOUNCE_MS = 220;
    let zoomBox = null;
    let panState = null;
    let pendingClickTimer = null;
    let mode = null;               // "zoom-box" | "pan" | null

    function eventToView(e) {
      const rect = imgCanvas.getBoundingClientRect();
      const dx = ((e.clientX - rect.left) / rect.width) * imgCanvas.width;
      const dy = ((e.clientY - rect.top) / rect.height) * imgCanvas.height;
      const v = view;
      return {
        x: v.x0 + (dx / imgCanvas.width) * (v.x1 - v.x0),
        y: v.y0 + (dy / imgCanvas.height) * (v.y1 - v.y0),
      };
    }

    function clampView(v) {
      const f = frames[frameIdx];
      const w = Math.min(v.x1 - v.x0, f.W);
      const h = Math.min(v.y1 - v.y0, f.H);
      if (v.x0 < 0) { v.x0 = 0; v.x1 = w; }
      if (v.y0 < 0) { v.y0 = 0; v.y1 = h; }
      if (v.x1 > f.W) { v.x1 = f.W; v.x0 = f.W - w; }
      if (v.y1 > f.H) { v.y1 = f.H; v.y0 = f.H - h; }
      if (v.x0 < 0) v.x0 = 0;
      if (v.y0 < 0) v.y0 = 0;
    }

    // Always-on readout: visible whenever the cursor is over the image.
    imgCanvas.addEventListener("pointerenter", (e) => {
      const p = eventToView(e);
      updateReadout(e.clientX, e.clientY, p.x, p.y);
    });
    imgCanvas.addEventListener("pointerleave", () => { hideReadout(); });

    imgCanvas.addEventListener("pointerdown", (e) => {
      hideMeta();
      if (pendingClickTimer) { clearTimeout(pendingClickTimer); pendingClickTimer = null; }
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        mode = "pan";
        panState = { lastX: e.clientX, lastY: e.clientY };
        imgBox.classList.add(`${id}-panning`);
        imgCanvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else if (e.button === 0) {
        const p = eventToView(e);
        mode = "zoom-box";
        zoomBox = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
        imgCanvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });

    imgCanvas.addEventListener("pointermove", (e) => {
      // Always update readout regardless of mode.
      const p = eventToView(e);
      updateReadout(e.clientX, e.clientY, p.x, p.y);
      if (mode === "zoom-box" && zoomBox) {
        zoomBox.x1 = p.x; zoomBox.y1 = p.y;
        presentView();
      } else if (mode === "pan" && panState) {
        const v = view;
        const sw = v.x1 - v.x0, sh = v.y1 - v.y0;
        const dxSrc = -((e.clientX - panState.lastX) / imgCanvas.clientWidth) * sw;
        const dySrc = -((e.clientY - panState.lastY) / imgCanvas.clientHeight) * sh;
        v.x0 += dxSrc; v.x1 += dxSrc;
        v.y0 += dySrc; v.y1 += dySrc;
        clampView(v);
        panState.lastX = e.clientX;
        panState.lastY = e.clientY;
        presentView();
      }
    });

    const endPointer = (e) => {
      if (mode === "zoom-box" && zoomBox) {
        const v = view;
        const dx = Math.abs(zoomBox.x1 - zoomBox.x0);
        const dy = Math.abs(zoomBox.y1 - zoomBox.y0);
        if (dx > DRAG_PX && dy > DRAG_PX) {
          // Real drag -> commit square zoom
          const side = Math.max(dx, dy);
          const cx = (zoomBox.x0 + zoomBox.x1) / 2;
          const cy = (zoomBox.y0 + zoomBox.y1) / 2;
          v.x0 = cx - side / 2; v.x1 = cx + side / 2;
          v.y0 = cy - side / 2; v.y1 = cy + side / 2;
          clampView(v);
        } else {
          // No drag -> debounced click-to-center (dblclick can supersede).
          const pos = { x: zoomBox.x0, y: zoomBox.y0 };
          pendingClickTimer = setTimeout(() => {
            pendingClickTimer = null;
            const w = view.x1 - view.x0, h = view.y1 - view.y0;
            view.x0 = pos.x - w / 2; view.x1 = pos.x + w / 2;
            view.y0 = pos.y - h / 2; view.y1 = pos.y + h / 2;
            clampView(view);
            presentView();
          }, CLICK_DEBOUNCE_MS);
        }
        zoomBox = null;
        presentView();
      }
      mode = null;
      panState = null;
      imgBox.classList.remove(`${id}-panning`);
      try { imgCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    imgCanvas.addEventListener("pointerup", endPointer);
    imgCanvas.addEventListener("pointercancel", endPointer);

    function updateReadout(clientX, clientY, viewX, viewY) {
      // Early-out if the cursor is outside the canvas. During pointer-capture
      // (drag), pointermove keeps firing with off-canvas coords and would
      // otherwise re-show the readout right after pointerleave hid it.
      const cRect = imgCanvas.getBoundingClientRect();
      if (clientX < cRect.left || clientX > cRect.right ||
          clientY < cRect.top  || clientY > cRect.bottom) {
        hideReadout();
        return;
      }
      const f = frames[frameIdx];
      const ix = Math.max(0, Math.min(f.W - 1, Math.floor(viewX)));
      const iy = Math.max(0, Math.min(f.H - 1, Math.floor(viewY)));
      // De-quantize stored uint16 back to a logical float.
      const u16val = f.u16[iy * f.W + ix];
      const value = f.vmin + (u16val / 65535) * (f.vmax - f.vmin);
      const boxRect = imgBox.getBoundingClientRect();
      const lx = clientX - boxRect.left;
      const ly = clientY - boxRect.top;
      // Offset so the readout isn't under the cursor. Flip sides if it would
      // overflow the image box.
      const offX = 14, offY = 14;
      const RW = 130, RH = 28;  // approximate readout size for overflow checks
      const flipX = lx + offX + RW > boxRect.width;
      const flipY = ly + offY + RH > boxRect.height;
      readoutEl.style.left = `${lx + (flipX ? -offX - RW : offX)}px`;
      readoutEl.style.top  = `${ly + (flipY ? -offY - RH : offY)}px`;
      readoutEl.textContent = `(${ix}, ${iy}) = ${value.toFixed(4)}`;
      readoutEl.style.display = "block";
    }
    function hideReadout() { readoutEl.style.display = "none"; }

    // Full reset: view, all per-frame display ranges, colormap.
    function resetAll() {
      if (pendingClickTimer) { clearTimeout(pendingClickTimer); pendingClickTimer = null; }
      const f = frames[frameIdx];
      view.x0 = 0; view.y0 = 0; view.x1 = f.W; view.y1 = f.H;
      for (let i = 0; i < frames.length; i++) {
        frameRanges[i].vmin = frames[i].mean - 1 * frames[i].std;
        frameRanges[i].vmax = frames[i].mean + 2 * frames[i].std;
      }
      cmapName = "gray";
      cmapSel.value = "gray";
      hideMeta();
      paint();
    }
    // Double-click also resets everything (matches the Reset button).
    imgCanvas.addEventListener("dblclick", (e) => {
      e.preventDefault();
      resetAll();
    });

    imgCanvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const f = frames[frameIdx];
      const v = view;
      const p = eventToView(e);
      const side = v.x1 - v.x0;
      const factor = Math.exp(e.deltaY * 0.0015);  // wheel-up = deltaY<0 = zoom-in
      // Square view, so a single side. Clamp to [16 px, min(W,H)].
      const newSide = Math.max(16, Math.min(Math.min(f.W, f.H), side * factor));
      v.x0 = p.x - (p.x - v.x0) * (newSide / side);
      v.y0 = p.y - (p.y - v.y0) * (newSide / side);
      v.x1 = v.x0 + newSide;
      v.y1 = v.y0 + newSide;
      clampView(v);
      presentView();
    }, { passive: false });

    imgCanvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showMeta(e);
    });

    function showMeta(e) {
      const f = frames[frameIdx];
      const v = view;
      const boxRect = imgBox.getBoundingClientRect();
      // Position popup near the click, clamped inside the image box
      const x = Math.min(e.clientX - boxRect.left, boxRect.width - 290);
      const y = Math.min(e.clientY - boxRect.top, boxRect.height - 200);
      metaEl.style.left = `${Math.max(8, x)}px`;
      metaEl.style.top = `${Math.max(8, y)}px`;
      metaEl.innerHTML = `
        <span class="${id}-meta-close" title="close">×</span>
        <div><strong>Frame</strong>: ${f.label}</div>
        <div><strong>Source shape</strong>: ${f.W} × ${f.H} px</div>
        <div><strong>Pixel size</strong>: ${meta.pixel_size_nm.toFixed(4)} nm/px</div>
        <div><strong>Data range</strong>: ${f.vmin.toFixed(4)} … ${f.vmax.toFixed(4)}</div>
        <div><strong>Mean ± std</strong>: ${f.mean.toFixed(4)} ± ${f.std.toFixed(4)}</div>
        <div><strong>Display range</strong>: ${frameRanges[frameIdx].vmin.toFixed(4)} … ${frameRanges[frameIdx].vmax.toFixed(4)}</div>
        <div><strong>View</strong>: (${v.x0.toFixed(0)}, ${v.y0.toFixed(0)}) → (${v.x1.toFixed(0)}, ${v.y1.toFixed(0)})</div>
      `;
      metaEl.style.display = "block";
      const closeBtn = metaEl.querySelector(`.${id}-meta-close`);
      if (closeBtn) closeBtn.addEventListener("click", hideMeta);
    }
    function hideMeta() { metaEl.style.display = "none"; }

    resetBtn.addEventListener("click", () => { resetAll(); });

    // -----------------------------------------------------------
    // Histogram drag: dual-handle range (unchanged from before)
    // -----------------------------------------------------------
    let dragging = null;
    function canvasXFromEvent(e) {
      const rect = histCanvas.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * histCanvas.width;
    }
    function valueFromX(x) {
      const f = frames[frameIdx];
      const t = Math.max(0, Math.min(1, x / histCanvas.width));
      return f.vmin + t * (f.vmax - f.vmin);
    }
    function xFromValue(val) {
      const f = frames[frameIdx];
      return ((val - f.vmin) / (f.vmax - f.vmin)) * histCanvas.width;
    }
    histCanvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const x = canvasXFromEvent(e);
      const r = frameRanges[frameIdx];
      const dMin = Math.abs(x - xFromValue(r.vmin));
      const dMax = Math.abs(x - xFromValue(r.vmax));
      dragging = dMin <= dMax ? "vmin" : "vmax";
      histCanvas.setPointerCapture(e.pointerId);
      applyHistDrag(x);
    });
    histCanvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      applyHistDrag(canvasXFromEvent(e));
    });
    const endHistDrag = (e) => {
      if (!dragging) return;
      dragging = null;
      try { histCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    histCanvas.addEventListener("pointerup", endHistDrag);
    histCanvas.addEventListener("pointercancel", endHistDrag);
    function applyHistDrag(x) {
      const f = frames[frameIdx];
      const r = frameRanges[frameIdx];
      const eps = (f.vmax - f.vmin) / 1000;
      const v = valueFromX(x);
      if (dragging === "vmin") r.vmin = Math.min(v, r.vmax - eps);
      else if (dragging === "vmax") r.vmax = Math.max(v, r.vmin + eps);
      paint();
    }

    paint();

    frameSel.addEventListener("change", () => {
      frameIdx = parseInt(frameSel.value, 10);
      hideMeta();
      // View is shared across frames — but if a future dataset has frames of
      // different sizes the clamp keeps the view valid.
      clampView(view);
      paint();
    });
    cmapSel.addEventListener("change", () => { cmapName = cmapSel.value; paint(); });
    scalebarToggle.addEventListener("change", () => {
      const v = scalebarToggle.checked ? "block" : "none";
      scalebarEl.style.display = v;
      scalebarLabel.style.display = v;
    });
  }).catch(err => {
    wrap.innerHTML = `<div style="padding: 16px; color: #c33; font-family: monospace; font-size: 12px;">Failed to load image data:<br>${err.message}</div>`;
  });

  // No window/document listeners → no cleanup needed.
}

export default { render };
export { render };
