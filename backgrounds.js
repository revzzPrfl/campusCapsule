// backgrounds.js - Background shaders and visual effects for campusCapsule

let activeAnimationId = null;
let currentCanvas = null;
let resizeHandler = null;

// Hex to RGB normalized helper
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [
    parseInt(m[1], 16) / 255, 
    parseInt(m[2], 16) / 255, 
    parseInt(m[3], 16) / 255
  ] : [1, 1, 1];
}

// Clean up any running background loops and event listeners
function cleanupBackground() {
  if (activeAnimationId) {
    cancelAnimationFrame(activeAnimationId);
    activeAnimationId = null;
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  if (currentCanvas) {
    // Lose WebGL context if it's WebGL
    try {
      const gl = currentCanvas.getContext("webgl") || currentCanvas.getContext("experimental-webgl");
      if (gl) {
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
      }
    } catch(e) {}
    currentCanvas.remove();
    currentCanvas = null;
  }
}

// Main background switch router
function setPageBackground(pageId) {
  cleanupBackground();
  
  // Find background container or append to body
  let bgContainer = document.getElementById("page-bg-container");
  if (!bgContainer) {
    bgContainer = document.createElement("div");
    bgContainer.id = "page-bg-container";
    bgContainer.className = "page-background-wrapper";
    document.body.appendChild(bgContainer);
  } else {
    bgContainer.innerHTML = "";
  }

  // Set CSS state based on page
  bgContainer.className = `page-background-wrapper bg-mode-${pageId}`;

  const canvas = document.createElement("canvas");
  canvas.className = "background-canvas";
  bgContainer.appendChild(canvas);
  currentCanvas = canvas;

  if (pageId === "superpage") {
    initLiquidChrome(canvas);
  } else if (pageId === "events") {
    initGradientBlinds(canvas);
  } else if (pageId === "gossip") {
    initGalaxy(canvas);
  } else if (pageId === "posts") {
    initFloatingLines(canvas);
  } else if (pageId === "peekaboo") {
    initFaultyTerminal(canvas);
  } else if (pageId === "projects") {
    initLiquidEther(canvas);
  } else if (pageId === "auth") {
    initSplashCursor(canvas);
  } else {
    // Default dashboard background (simple ambient glow)
    initDefaultAmbient(canvas);
  }
}

// 1. GRID DISTORTION BACKGROUND (Superpage - Blue & Green Shades)
function initGridDistortion(canvas) {
  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  let mouse = { x: -1000, y: -1000, active: false };
  
  const handleMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  };

  const handleMouseLeave = () => {
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.active = false;
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseleave", handleMouseLeave);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resizeHandler);

  const gridSpacing = 40;
  let time = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw subtle dark background
    ctx.fillStyle = "rgba(18, 20, 32, 1)";
    ctx.fillRect(0, 0, width, height);

    // Calculate grid dimensions
    const cols = Math.ceil(width / gridSpacing) + 2;
    const rows = Math.ceil(height / gridSpacing) + 2;

    const points = [];

    // Calculate all grid points with distortion
    for (let c = 0; c < cols; c++) {
      points[c] = [];
      for (let r = 0; r < rows; r++) {
        const x = (c - 1) * gridSpacing;
        const y = (r - 1) * gridSpacing;

        // Wave animation based on time & coordinates
        const waveX = Math.sin(y * 0.003 + time * 1.5) * 8 + Math.cos(x * 0.002 + time) * 4;
        const waveY = Math.cos(x * 0.003 + time * 1.2) * 8 + Math.sin(y * 0.002 + time * 0.8) * 4;

        let px = x + waveX;
        let py = y + waveY;

        // Mouse distortion (push points away)
        if (mouse.active) {
          const dx = px - mouse.x;
          const dy = py - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const force = (180 - dist) / 180;
            const angle = Math.atan2(dy, dx);
            px += Math.cos(angle) * force * 30;
            py += Math.sin(angle) * force * 30;
          }
        }

        points[c][r] = { x: px, y: py };
      }
    }

    // Draw mesh lines
    ctx.lineWidth = 1;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const p = points[c][r];
        
        // Horizontal line
        if (c < cols - 1) {
          const pRight = points[c + 1][r];
          // Gradient between blue and green
          const grad = ctx.createLinearGradient(p.x, p.y, pRight.x, pRight.y);
          grad.addColorStop(0, "rgba(58, 134, 200, 0.15)"); // Blue
          grad.addColorStop(1, "rgba(46, 196, 182, 0.15)"); // Green/Cyan
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pRight.x, pRight.y);
          ctx.stroke();
        }

        // Vertical line
        if (r < rows - 1) {
          const pBottom = points[c][r + 1];
          const grad = ctx.createLinearGradient(p.x, p.y, pBottom.x, pBottom.y);
          grad.addColorStop(0, "rgba(58, 134, 200, 0.15)"); // Blue
          grad.addColorStop(1, "rgba(46, 196, 182, 0.15)"); // Green
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pBottom.x, pBottom.y);
          ctx.stroke();
        }
      }
    }

    // Draw faint glowing particles at nodes
    for (let c = 0; c < cols; c += 2) {
      for (let r = 0; r < rows; r += 2) {
        const p = points[c][r];
        if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = (c + r) % 4 === 0 ? "rgba(46, 196, 182, 0.4)" : "rgba(58, 134, 200, 0.4)";
          ctx.fill();
        }
      }
    }

    time += 0.008;
    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  // Return helper to cleanup mouse listeners specifically
  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseleave", handleMouseLeave);
    originalCleanup();
  };
}

// 2. GRADIENT BLINDS BACKGROUND (Events - Bright Blue Shades)
function initGradientBlinds(canvas) {
  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resizeHandler);

  let time = 0;
  const numBlinds = 8;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(18, 20, 32, 1)";
    ctx.fillRect(0, 0, width, height);

    const blindWidth = width / numBlinds;

    for (let i = 0; i < numBlinds; i++) {
      const xStart = i * blindWidth;
      
      // Calculate animated vertical blinds gradient sweep
      const sweepOffset = Math.sin(time + i * 0.5) * 50;
      const opacity = 0.08 + Math.sin(time + i * 0.4) * 0.04;

      const grad = ctx.createLinearGradient(
        xStart + sweepOffset, 
        0, 
        xStart + blindWidth + sweepOffset, 
        height
      );
      
      // Dynamic bright blue color gradients
      grad.addColorStop(0, `rgba(58, 134, 200, ${opacity})`);
      grad.addColorStop(0.5, `rgba(78, 168, 222, ${opacity * 1.5})`);
      grad.addColorStop(1, `rgba(3, 4, 94, ${opacity * 0.5})`);

      ctx.fillStyle = grad;
      ctx.fillRect(xStart, 0, blindWidth, height);

      // Draw vertical divider thin lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStart, 0);
      ctx.lineTo(xStart, height);
      ctx.stroke();
    }

    time += 0.015;
    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

// 3. SIDERAYS WEBGL SHADER BACKGROUND (Gossip - Yellow & Blue Rays)
function initSideRays(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    // Fallback to 2D canvas if WebGL fails
    initDefaultAmbient(canvas);
    return;
  }

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    precision highp float;

    uniform float iTime;
    uniform vec2 iResolution;
    uniform float iSpeed;
    uniform vec3 iRayColor1;
    uniform vec3 iRayColor2;
    uniform float iIntensity;
    uniform float iSpread;
    uniform float iFlipX;
    uniform float iFlipY;
    uniform float iTilt;
    uniform float iSaturation;
    uniform float iBlend;
    uniform float iFalloff;
    uniform float iOpacity;

    float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
      vec2 sourceToCoord = coord - raySource;
      float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
      return clamp(
        (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
        (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
        0.0, 1.0) *
        clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
    }

    void main() {
      vec2 fragCoord = gl_FragCoord.xy;
      if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
      if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

      vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
      vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

      float tiltRad = iTilt * 3.14159265 / 180.0;
      float cs = cos(tiltRad);
      float sn = sin(tiltRad);
      vec2 rel = coord - rayPos;
      vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

      float halfSpread = iSpread * 0.275;
      vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
      vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

      vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
      vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

      vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

      float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
      float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
      color.rgb *= brightness;

      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, iSaturation);

      color.a = max(color.r, max(color.g, color.b)) * iOpacity;
      
      // Blend with dark background
      vec3 finalColor = mix(vec3(0.07, 0.08, 0.13), color.rgb, color.a);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Shader compilation helper
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);

  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  // Buffer coordinates for full screen triangle
  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uTime = gl.getUniformLocation(program, "iTime");
  const uResolution = gl.getUniformLocation(program, "iResolution");
  const uSpeed = gl.getUniformLocation(program, "iSpeed");
  const uRayColor1 = gl.getUniformLocation(program, "iRayColor1");
  const uRayColor2 = gl.getUniformLocation(program, "iRayColor2");
  const uIntensity = gl.getUniformLocation(program, "iIntensity");
  const uSpread = gl.getUniformLocation(program, "iSpread");
  const uFlipX = gl.getUniformLocation(program, "iFlipX");
  const uFlipY = gl.getUniformLocation(program, "iFlipY");
  const uTilt = gl.getUniformLocation(program, "iTilt");
  const uSaturation = gl.getUniformLocation(program, "iSaturation");
  const uBlend = gl.getUniformLocation(program, "iBlend");
  const uFalloff = gl.getUniformLocation(program, "iFalloff");
  const uOpacity = gl.getUniformLocation(program, "iOpacity");

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();

  function draw() {
    const elapsed = (Date.now() - startTime) * 0.001;

    gl.clearColor(0.07, 0.08, 0.13, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update uniforms matching side-rays specification
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uResolution, width, height);
    gl.uniform1f(uSpeed, 2.5);
    
    // Ray Colors (Yellow: #EAB308 and Cyan/Blue: #96c8ff)
    const color1 = hexToRgb("#EAB308");
    const color2 = hexToRgb("#96c8ff");
    gl.uniform3f(uRayColor1, color1[0], color1[1], color1[2]);
    gl.uniform3f(uRayColor2, color2[0], color2[1], color2[2]);
    
    gl.uniform1f(uIntensity, 2.0);
    gl.uniform1f(uSpread, 2.0);
    gl.uniform1f(uFlipX, 0.0); // origin = top-right -> flipX = 0, flipY = 0
    gl.uniform1f(uFlipY, 0.0);
    gl.uniform1f(uTilt, 0.0);
    gl.uniform1f(uSaturation, 1.5);
    gl.uniform1f(uBlend, 0.75);
    gl.uniform1f(uFalloff, 1.6);
    gl.uniform1f(uOpacity, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

// 4. DEFAULT/FALLBACK AMBIENT BACKGROUND
function initDefaultAmbient(canvas) {
  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resizeHandler);

  let time = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Ambient background gradient
    ctx.fillStyle = "rgba(18, 20, 32, 1)";
    ctx.fillRect(0, 0, width, height);

    // Glowing corner blobs
    const glowRadius = Math.min(width, height) * 0.7;
    const wave = Math.sin(time) * 30;

    // Pink ambient top-left
    const grad1 = ctx.createRadialGradient(
      0, 0, 10,
      wave, wave, glowRadius
    );
    grad1.addColorStop(0, "rgba(128, 15, 47, 0.18)");
    grad1.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // Blue ambient bottom-right
    const grad2 = ctx.createRadialGradient(
      width, height, 10,
      width - wave, height - wave, glowRadius
    );
    grad2.addColorStop(0, "rgba(58, 134, 200, 0.18)");
    grad2.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    time += 0.01;
    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

// 5. FAULTYTERMINAL WEBGL SHADER BACKGROUND (Peekaboo - Green Digit Matrix Grid)
function initFaultyTerminal(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    precision mediump float;

    varying vec2 vUv;

    uniform float iTime;
    uniform vec3  iResolution;
    uniform float uScale;

    uniform vec2  uGridMul;
    uniform float uDigitSize;
    uniform float uScanlineIntensity;
    uniform float uGlitchAmount;
    uniform float uFlickerAmount;
    uniform float uNoiseAmp;
    uniform float uChromaticAberration;
    uniform float uDither;
    uniform float uCurvature;
    uniform vec3  uTint;
    uniform vec2  uMouse;
    uniform float uMouseStrength;
    uniform float uUseMouse;
    uniform float uPageLoadProgress;
    uniform float uUsePageLoadAnimation;
    uniform float uBrightness;

    float time;

    float hash21(vec2 p){
      p = fract(p * 234.56);
      p += dot(p, p + 34.56);
      return fract(p.x * p.y);
    }

    float noise(vec2 p)
    {
      return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
    }

    mat2 rotate(float angle)
    {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c);
    }

    float fbm(vec2 p)
    {
      p *= 1.1;
      float f = 0.0;
      float amp = 0.5 * uNoiseAmp;
      
      mat2 modify0 = rotate(time * 0.02);
      f += amp * noise(p);
      p = modify0 * p * 2.0;
      amp *= 0.454545;
      
      mat2 modify1 = rotate(time * 0.02);
      f += amp * noise(p);
      p = modify1 * p * 2.0;
      amp *= 0.454545;
      
      mat2 modify2 = rotate(time * 0.08);
      f += amp * noise(p);
      
      return f;
    }

    float pattern(vec2 p, out vec2 q, out vec2 r) {
      vec2 offset1 = vec2(1.0);
      vec2 offset0 = vec2(0.0);
      mat2 rot01 = rotate(0.1 * time);
      mat2 rot1 = rotate(0.1);
      
      q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
      r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
      return fbm(p + r);
    }

    float digit(vec2 p){
        vec2 grid = uGridMul * 15.0;
        vec2 s = floor(p * grid) / grid;
        p = p * grid;
        vec2 q, r;
        float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
        
        if(uUseMouse > 0.5){
            vec2 mouseWorld = uMouse * uScale;
            float distToMouse = distance(s, mouseWorld);
            float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
            intensity += mouseInfluence;
            
            float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
            intensity += ripple;
        }
        
        if(uUsePageLoadAnimation > 0.5){
            float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
            float cellDelay = cellRandom * 0.8;
            float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
            
            float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
            intensity *= fadeAlpha;
        }
        
        p = fract(p);
        p *= uDigitSize;
        
        float px5 = p.x * 5.0;
        float py5 = (1.0 - p.y) * 5.0;
        float x = fract(px5);
        float y = fract(py5);
        
        float i = floor(py5) - 2.0;
        float j = floor(px5) - 2.0;
        float n = i * i + j * j;
        float f = n * 0.0625;
        
        float isOn = step(0.1, intensity - f);
        float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
        
        return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
    }

    float onOff(float a, float b, float c)
    {
      return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
    }

    float displace(vec2 look)
    {
        float y = look.y - mod(iTime * 0.25, 1.0);
        float window = 1.0 / (1.0 + 50.0 * y * y);
        return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
    }

    vec3 getColor(vec2 p){
        
        float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
        bar *= uScanlineIntensity;
        
        float displacement = displace(p);
        p.x += displacement;

        if (uGlitchAmount != 1.0) {
          float extra = displacement * (uGlitchAmount - 1.0);
          p.x += extra;
        }

        float middle = digit(p);
        
        const float off = 0.002;
        float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                    digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                    digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
        
        vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
        return baseColor;
    }

    vec2 barrel(vec2 uv){
      vec2 c = uv * 2.0 - 1.0;
      float r2 = dot(c, c);
      c *= 1.0 + uCurvature * r2;
      return c * 0.5 + 0.5;
    }

    void main() {
        time = iTime * 0.333333;
        vec2 uv = vUv;

        if(uCurvature != 0.0){
          uv = barrel(uv);
        }
        
        vec2 p = uv * uScale;
        vec3 col = getColor(p);

        if(uChromaticAberration != 0.0){
          vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
          col.r = getColor(p + ca).r;
          col.b = getColor(p - ca).b;
        }

        col *= uTint;
        col *= uBrightness;

        if(uDither > 0.0){
          float rnd = hash21(gl_FragCoord.xy);
          col += (rnd - 0.5) * (uDither * 0.003922);
        }

        gl_FragColor = vec4(col, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  // Get Uniforms
  const uTime = gl.getUniformLocation(program, "iTime");
  const uResolution = gl.getUniformLocation(program, "iResolution");
  const uScaleLoc = gl.getUniformLocation(program, "uScale");
  const uGridMulLoc = gl.getUniformLocation(program, "uGridMul");
  const uDigitSizeLoc = gl.getUniformLocation(program, "uDigitSize");
  const uScanlineIntensityLoc = gl.getUniformLocation(program, "uScanlineIntensity");
  const uGlitchAmountLoc = gl.getUniformLocation(program, "uGlitchAmount");
  const uFlickerAmountLoc = gl.getUniformLocation(program, "uFlickerAmount");
  const uNoiseAmpLoc = gl.getUniformLocation(program, "uNoiseAmp");
  const uChromaticAberrationLoc = gl.getUniformLocation(program, "uChromaticAberration");
  const uDitherLoc = gl.getUniformLocation(program, "uDither");
  const uCurvatureLoc = gl.getUniformLocation(program, "uCurvature");
  const uTintLoc = gl.getUniformLocation(program, "uTint");
  const uMouseLoc = gl.getUniformLocation(program, "uMouse");
  const uMouseStrengthLoc = gl.getUniformLocation(program, "uMouseStrength");
  const uUseMouseLoc = gl.getUniformLocation(program, "uUseMouse");
  const uPageLoadProgressLoc = gl.getUniformLocation(program, "uPageLoadProgress");
  const uUsePageLoadAnimationLoc = gl.getUniformLocation(program, "uUsePageLoadAnimation");
  const uBrightnessLoc = gl.getUniformLocation(program, "uBrightness");

  let mouse = { x: 0.5, y: 0.5, active: 0 };
  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = 1.0 - ((e.clientY - rect.top) / rect.height);
    mouse.active = 1.0;
  };
  const handleMouseLeave = () => {
    mouse.active = 0.0;
  };
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseleave", handleMouseLeave);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();

  function draw() {
    const elapsed = (Date.now() - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform1f(uTime, elapsed);
    gl.uniform3f(uResolution, width, height, width / height);
    gl.uniform1f(uScaleLoc, 1.5);
    gl.uniform2f(uGridMulLoc, 2.0, 1.0);
    gl.uniform1f(uDigitSizeLoc, 1.2);
    gl.uniform1f(uScanlineIntensityLoc, 0.5);
    gl.uniform1f(uGlitchAmountLoc, 1.0);
    gl.uniform1f(uFlickerAmountLoc, 1.0);
    gl.uniform1f(uNoiseAmpLoc, 1.0);
    gl.uniform1f(uChromaticAberrationLoc, 0.0);
    gl.uniform1f(uDitherLoc, 0.0);
    gl.uniform1f(uCurvatureLoc, 0.1);
    
    // Tint #A7EF9E
    gl.uniform3f(uTintLoc, 167/255, 239/255, 158/255);
    
    gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
    gl.uniform1f(uMouseStrengthLoc, 0.5);
    gl.uniform1f(uUseMouseLoc, mouse.active);
    
    const progress = Math.min(elapsed / 2.0, 1.0);
    gl.uniform1f(uPageLoadProgressLoc, progress);
    gl.uniform1f(uUsePageLoadAnimationLoc, 1.0);
    gl.uniform1f(uBrightnessLoc, 0.6);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseleave", handleMouseLeave);
    originalCleanup();
  };
}

// 6. FLOATINGLINES THREE.JS SHADER BACKGROUND (Posts - Wave Lines)
function initFloatingLines(canvas) {
  if (typeof THREE === "undefined") {
    initDefaultAmbient(canvas);
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  renderer.setSize(width, height, false);

  const vertexShader = `
    precision highp float;
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float iTime;
    uniform vec3  iResolution;
    uniform float animationSpeed;

    uniform bool enableTop;
    uniform bool enableMiddle;
    uniform bool enableBottom;

    uniform int topLineCount;
    uniform int middleLineCount;
    uniform int bottomLineCount;

    uniform float topLineDistance;
    uniform float middleLineDistance;
    uniform float bottomLineDistance;

    uniform vec3 topWavePosition;
    uniform vec3 middleWavePosition;
    uniform vec3 bottomWavePosition;

    uniform vec2 iMouse;
    uniform bool interactive;
    uniform float bendRadius;
    uniform float bendStrength;
    uniform float bendInfluence;

    uniform bool parallax;
    uniform float parallaxStrength;
    uniform vec2 parallaxOffset;

    uniform vec3 lineGradient[8];
    uniform int lineGradientCount;

    const vec3 BLACK = vec3(0.0);
    const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
    const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

    mat2 rotate(float r) {
      return mat2(cos(r), sin(r), -sin(r), cos(r));
    }

    vec3 background_color(vec2 uv) {
      vec3 col = vec3(0.0);
      float y = sin(uv.x - 0.2) * 0.3 - 0.1;
      float m = uv.y - y;
      col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
      col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
      return col * 0.5;
    }

    vec3 getLineColor(float t, vec3 baseColor) {
      if (lineGradientCount <= 0) {
        return baseColor;
      }
      if (lineGradientCount == 1) {
        return lineGradient[0] * 0.5;
      }
      float clampedT = clamp(t, 0.0, 0.9999);
      float scaled = clampedT * float(lineGradientCount - 1);
      int idx = int(floor(scaled));
      float f = fract(scaled);
      vec3 c1 = vec3(1.0);
      vec3 c2 = vec3(1.0);
      
      for (int i = 0; i < 8; i++) {
        if (i == idx) c1 = lineGradient[i];
        if (i == idx + 1) c2 = lineGradient[i];
      }
      return mix(c1, c2, f) * 0.5;
    }

    float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
      float time = iTime * animationSpeed;
      float x_offset   = offset;
      float x_movement = time * 0.1;
      float amp        = sin(offset + time * 0.2) * 0.3;
      float y          = sin(uv.x + x_offset + x_movement) * amp;

      if (shouldBend) {
        vec2 d = screenUv - mouseUv;
        float influence = exp(-dot(d, d) * bendRadius);
        float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
        y += bendOffset;
      }
      float m = uv.y - y;
      return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
      baseUv.y *= -1.0;
      
      if (parallax) {
        baseUv += parallaxOffset;
      }

      vec3 col = vec3(0.0);
      vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

      vec2 mouseUv = vec2(0.0);
      if (interactive) {
        mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
        mouseUv.y *= -1.0;
      }
      
      if (enableBottom) {
        for (int i = 0; i < 8; ++i) {
          if (i >= bottomLineCount) break;
          float fi = float(i);
          float t = fi / max(float(bottomLineCount - 1), 1.0);
          vec3 lineCol = getLineColor(t, b);
          
          float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
          vec2 ruv = baseUv * rotate(angle);
          col += lineCol * wave(
            ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
            1.5 + 0.2 * fi,
            baseUv,
            mouseUv,
            interactive
          ) * 0.2;
        }
      }

      if (enableMiddle) {
        for (int i = 0; i < 8; ++i) {
          if (i >= middleLineCount) break;
          float fi = float(i);
          float t = fi / max(float(middleLineCount - 1), 1.0);
          vec3 lineCol = getLineColor(t, b);
          
          float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
          vec2 ruv = baseUv * rotate(angle);
          col += lineCol * wave(
            ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
            2.0 + 0.15 * fi,
            baseUv,
            mouseUv,
            interactive
          );
        }
      }

      if (enableTop) {
        for (int i = 0; i < 8; ++i) {
          if (i >= topLineCount) break;
          float fi = float(i);
          float t = fi / max(float(topLineCount - 1), 1.0);
          vec3 lineCol = getLineColor(t, b);
          
          float angle = topWavePosition.z * log(length(baseUv) + 1.0);
          vec2 ruv = baseUv * rotate(angle);
          ruv.x *= -1.0;
          col += lineCol * wave(
            ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
            1.0 + 0.2 * fi,
            baseUv,
            mouseUv,
            interactive
          ) * 0.1;
        }
      }

      fragColor = vec4(col, 1.0);
    }

    void main() {
      vec4 color = vec4(0.0);
      mainImage(color, gl_FragCoord.xy);
      gl_FragColor = color;
    }
  `;

  const hexColors = ["#e945f5", "#6f6f6f", "#6a6a6a"];
  const lineGradients = hexColors.map(hex => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  });
  while (lineGradients.length < 8) {
    lineGradients.push(new THREE.Vector3(0, 0, 0));
  }

  let mouse = new THREE.Vector2(-1000, -1000);
  let targetMouse = new THREE.Vector2(-1000, -1000);
  let influence = 0;
  let targetInfluence = 0;
  let parallaxOffset = new THREE.Vector2(0, 0);
  let targetParallax = new THREE.Vector2(0, 0);

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3(width, height, 1) },
    animationSpeed: { value: 1.0 },
    enableTop: { value: true },
    enableMiddle: { value: true },
    enableBottom: { value: true },
    topLineCount: { value: 8 },
    middleLineCount: { value: 8 },
    bottomLineCount: { value: 8 },
    topLineDistance: { value: 0.08 },
    middleLineDistance: { value: 0.08 },
    bottomLineDistance: { value: 0.08 },
    topWavePosition: { value: new THREE.Vector3(10.0, 0.5, -0.4) },
    middleWavePosition: { value: new THREE.Vector3(5.0, 0.0, 0.2) },
    bottomWavePosition: { value: new THREE.Vector3(2.0, -0.7, -1.0) },
    iMouse: { value: new THREE.Vector2(-1000, -1000) },
    interactive: { value: true },
    bendRadius: { value: 8.0 },
    bendStrength: { value: -2.0 },
    bendInfluence: { value: 0.0 },
    parallax: { value: true },
    parallaxStrength: { value: 0.2 },
    parallaxOffset: { value: new THREE.Vector2(0, 0) },
    lineGradient: { value: lineGradients },
    lineGradientCount: { value: 3 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthWrite: false,
    depthTest: false
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const clock = new THREE.Clock();

  const handlePointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dpr = window.devicePixelRatio || 1;

    targetMouse.set(x * dpr, (rect.height - y) * dpr);
    targetInfluence = 1.0;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    targetParallax.set(((x - centerX) / rect.width) * 0.2, -((y - centerY) / rect.height) * 0.2);
  };

  const handlePointerLeave = () => {
    targetInfluence = 0.0;
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerleave", handlePointerLeave);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    renderer.setSize(width, height, false);
    uniforms.iResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio(), 1);
  };
  window.addEventListener("resize", resizeHandler);

  function draw() {
    const elapsed = clock.getElapsedTime();
    uniforms.iTime.value = elapsed;

    mouse.lerp(targetMouse, 0.05);
    uniforms.iMouse.value.copy(mouse);

    influence += (targetInfluence - influence) * 0.05;
    uniforms.bendInfluence.value = influence;

    parallaxOffset.lerp(targetParallax, 0.05);
    uniforms.parallaxOffset.value.copy(parallaxOffset);

    renderer.render(scene, camera);
    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerleave", handlePointerLeave);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    originalCleanup();
  };
}

// 7. LIQUIDETHER WEBGL SHADER BACKGROUND (Projects - Viscous Lava Warp)
function initLiquidEther(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float iMouseActive;

    const vec3 color0 = vec3(0.32, 0.15, 1.0); // #5227FF
    const vec3 color1 = vec3(1.0, 0.62, 0.99); // #FF9FFC
    const vec3 color2 = vec3(0.70, 0.59, 0.81); // #B497CF

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 4; ++i) {
            v += a * noise(p);
            p = rot * p * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec2 p = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        
        if (iMouseActive > 0.5) {
            vec2 m = (iMouse - 0.5 * iResolution.xy) / iResolution.y;
            float d = length(p - m);
            if (d < 0.4) {
                float force = (1.0 - d / 0.4) * 0.15;
                p -= normalize(p - m) * force;
            }
        }

        vec2 q = vec2(0.0);
        q.x = fbm(p + 0.1 * iTime);
        q.y = fbm(p + vec2(1.0));

        vec2 r = vec2(0.0);
        r.x = fbm(p + 1.0 * q + vec2(1.7, 9.2) + 0.15 * iTime);
        r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * iTime);

        float f = fbm(p + 1.0 * r);

        vec3 col = mix(color0, color1, clamp(f * f * 4.0, 0.0, 1.0));
        col = mix(col, color2, clamp(length(q), 0.0, 1.0));
        col = mix(col, vec3(0.2, 0.05, 0.4), clamp(length(r.x), 0.0, 1.0));
        
        col += 0.1 * vec3(f * f);
        col = pow(col, vec3(1.1));
        
        float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
        col *= mix(0.6, 1.0, vignette);

        gl_FragColor = vec4(col, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, "iTime");
  const uResolution = gl.getUniformLocation(program, "iResolution");
  const uMouse = gl.getUniformLocation(program, "iMouse");
  const uMouseActive = gl.getUniformLocation(program, "iMouseActive");

  let mouse = { x: width / 2, y: height / 2, active: 0 };
  const handleMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = height - e.clientY;
    mouse.active = 1.0;
  };
  const handleMouseLeave = () => {
    mouse.active = 0.0;
  };
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseleave", handleMouseLeave);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();

  function draw() {
    const elapsed = (Date.now() - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uResolution, width, height);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uMouseActive, mouse.active);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseleave", handleMouseLeave);
    originalCleanup();
  };
}

// Append WebGL initWebGLGradientBlinds for Superpage
function initWebGLGradientBlinds(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec3  iResolution;
    uniform vec2  iMouse;
    uniform float iTime;

    uniform float uAngle;
    uniform float uNoise;
    uniform float uBlindCount;
    uniform float uSpotlightRadius;
    uniform float uSpotlightSoftness;
    uniform float uSpotlightOpacity;
    uniform float uMirror;
    uniform float uDistort;
    uniform float uShineFlip;
    uniform vec3  uColor0;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    uniform vec3  uColor3;
    uniform vec3  uColor4;
    uniform vec3  uColor5;
    uniform vec3  uColor6;
    uniform vec3  uColor7;
    uniform int   uColorCount;

    varying vec2 vUv;

    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }

    vec2 rotate2D(vec2 p, float a){
      float c = cos(a);
      float s = sin(a);
      return mat2(c, -s, s, c) * p;
    }

    vec3 getGradientColor(float t){
      float tt = clamp(t, 0.0, 1.0);
      int count = uColorCount;
      if (count < 2) count = 2;
      float scaled = tt * float(count - 1);
      float seg = floor(scaled);
      float f = fract(scaled);

      if (seg < 1.0) return mix(uColor0, uColor1, f);
      if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
      if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
      if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
      if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
      if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
      if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
      if (count > 7) return uColor7;
      if (count > 6) return uColor6;
      if (count > 5) return uColor5;
      if (count > 4) return uColor4;
      if (count > 3) return uColor3;
      if (count > 2) return uColor2;
      return uColor1;
    }

    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        vec2 uv0 = fragCoord.xy / iResolution.xy;

        float aspect = iResolution.x / iResolution.y;
        vec2 p = uv0 * 2.0 - 1.0;
        p.x *= aspect;
        vec2 pr = rotate2D(p, uAngle);
        pr.x /= aspect;
        vec2 uv = pr * 0.5 + 0.5;

        vec2 uvMod = uv;
        if (uDistort > 0.0) {
          float a = uvMod.y * 6.0;
          float b = uvMod.x * 6.0;
          float w = 0.01 * uDistort;
          uvMod.x += sin(a) * w;
          uvMod.y += cos(b) * w;
        }
        float t = uvMod.x;
        if (uMirror > 0.5) {
          t = 1.0 - abs(1.0 - 2.0 * fract(t));
        }
        vec3 base = getGradientColor(t);

        vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
        float d = length(uv0 - offset);
        float r = max(uSpotlightRadius, 1e-4);
        float dn = d / r;
        float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
        vec3 cir = vec3(spot);
        float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
        if (uShineFlip > 0.5) stripe = 1.0 - stripe;
        vec3 ran = vec3(stripe);

        vec3 col = cir + base - ran;
        col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

        fragColor = vec4(col, 1.0);
    }

    void main() {
        vec4 color;
        mainImage(color, vUv * iResolution.xy);
        gl_FragColor = color;
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);

  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  // Get Uniforms
  const uTime = gl.getUniformLocation(program, "iTime");
  const uResolution = gl.getUniformLocation(program, "iResolution");
  const uMouse = gl.getUniformLocation(program, "iMouse");
  const uAngleLoc = gl.getUniformLocation(program, "uAngle");
  const uNoiseLoc = gl.getUniformLocation(program, "uNoise");
  const uBlindCountLoc = gl.getUniformLocation(program, "uBlindCount");
  const uSpotlightRadiusLoc = gl.getUniformLocation(program, "uSpotlightRadius");
  const uSpotlightSoftnessLoc = gl.getUniformLocation(program, "uSpotlightSoftness");
  const uSpotlightOpacityLoc = gl.getUniformLocation(program, "uSpotlightOpacity");
  const uMirrorLoc = gl.getUniformLocation(program, "uMirror");
  const uDistortLoc = gl.getUniformLocation(program, "uDistort");
  const uShineFlipLoc = gl.getUniformLocation(program, "uShineFlip");
  
  const uColor0Loc = gl.getUniformLocation(program, "uColor0");
  const uColor1Loc = gl.getUniformLocation(program, "uColor1");
  const uColor2Loc = gl.getUniformLocation(program, "uColor2");
  const uColor3Loc = gl.getUniformLocation(program, "uColor3");
  const uColor4Loc = gl.getUniformLocation(program, "uColor4");
  const uColor5Loc = gl.getUniformLocation(program, "uColor5");
  const uColor6Loc = gl.getUniformLocation(program, "uColor6");
  const uColor7Loc = gl.getUniformLocation(program, "uColor7");
  const uColorCountLoc = gl.getUniformLocation(program, "uColorCount");

  let mouse = [width / 2, height / 2];
  let targetMouse = [width / 2, height / 2];

  const handleMouseMove = (e) => {
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    targetMouse[0] = (e.clientX - rect.left) * scale;
    targetMouse[1] = (rect.height - (e.clientY - rect.top)) * scale;
  };

  window.addEventListener("mousemove", handleMouseMove);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();
  let lastTime = Date.now();

  function draw() {
    const now = Date.now();
    const elapsed = (now - startTime) * 0.001;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    gl.clearColor(0.07, 0.08, 0.13, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Apply mouse dampening (lerp)
    const factor = 1 - Math.exp(-dt / 0.15);
    mouse[0] += (targetMouse[0] - mouse[0]) * factor;
    mouse[1] += (targetMouse[1] - mouse[1]) * factor;

    gl.useProgram(program);

    gl.uniform1f(uTime, elapsed);
    gl.uniform3f(uResolution, width, height, 1.0);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);

    // Uniform settings
    gl.uniform1f(uAngleLoc, (20 * Math.PI) / 180);
    gl.uniform1f(uNoiseLoc, 0.5);
    gl.uniform1f(uBlindCountLoc, 16.0);
    gl.uniform1f(uSpotlightRadiusLoc, 0.5);
    gl.uniform1f(uSpotlightSoftnessLoc, 1.0);
    gl.uniform1f(uSpotlightOpacityLoc, 1.0);
    gl.uniform1f(uMirrorLoc, 0.0);
    gl.uniform1f(uDistortLoc, 0.0);
    gl.uniform1f(uShineFlipLoc, 0.0); // shineDirection = 'left' -> 0.0

    // Gradient colors: #FF9FFC and #5227FF
    const color0 = hexToRgb("#FF9FFC");
    const color1 = hexToRgb("#5227FF");

    gl.uniform3f(uColor0Loc, color0[0], color0[1], color0[2]);
    gl.uniform3f(uColor1Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor2Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor3Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor4Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor5Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor6Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(uColor7Loc, color1[0], color1[1], color1[2]);
    gl.uniform1i(uColorCountLoc, 2);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    originalCleanup();
  };
}

// 8. LIQUIDCHROME WEBGL SHADER BACKGROUND (Superpage - Metallic Liquid Ripple)
function initLiquidChrome(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    uniform vec3 uBaseColor;
    uniform float uAmplitude;
    uniform float uFrequencyX;
    uniform float uFrequencyY;
    uniform vec2 uMouse;
    varying vec2 vUv;

    vec4 renderImage(vec2 uvCoord) {
        vec2 fragCoord = uvCoord * uResolution.xy;
        vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

        for (int i = 1; i < 10; i++) {
            float fi = float(i);
            uv.x += uAmplitude / fi * cos(fi * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
            uv.y += uAmplitude / fi * cos(fi * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
        }

        vec2 diff = (uvCoord - uMouse);
        float dist = length(diff);
        float falloff = exp(-dist * 20.0);
        float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
        uv += (diff / (dist + 0.0001)) * ripple * falloff;

        vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
        return vec4(color, 1.0);
    }

    void main() {
        vec4 col = vec4(0.0);
        int samples = 0;
        for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
                vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                col += renderImage(vUv + offset);
                samples++;
            }
        }
        gl_FragColor = col / float(samples);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);

  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  // Get Uniforms
  const uTimeLoc = gl.getUniformLocation(program, "uTime");
  const uResolutionLoc = gl.getUniformLocation(program, "uResolution");
  const uBaseColorLoc = gl.getUniformLocation(program, "uBaseColor");
  const uAmplitudeLoc = gl.getUniformLocation(program, "uAmplitude");
  const uFrequencyXLoc = gl.getUniformLocation(program, "uFrequencyX");
  const uFrequencyYLoc = gl.getUniformLocation(program, "uFrequencyY");
  const uMouseLoc = gl.getUniformLocation(program, "uMouse");

  let mouse = { x: 0.5, y: 0.5 };
  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = 1.0 - ((e.clientY - rect.top) / rect.height);
  };
  window.addEventListener("mousemove", handleMouseMove);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();

  function draw() {
    const elapsed = (Date.now() - startTime) * 0.001;

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform1f(uTimeLoc, elapsed * 0.3);
    gl.uniform3f(uResolutionLoc, width, height, width / height);
    gl.uniform3f(uBaseColorLoc, 0.1, 0.1, 0.1);
    gl.uniform1f(uAmplitudeLoc, 0.3);
    gl.uniform1f(uFrequencyXLoc, 3.0);
    gl.uniform1f(uFrequencyYLoc, 3.0);
    gl.uniform2f(uMouseLoc, mouse.x, mouse.y);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    originalCleanup();
  };
}

// 9. GALAXY WEBGL SHADER BACKGROUND (Gossip - Interactive Rotating Starfield)
function initGalaxy(canvas) {
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const vertShaderSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragShaderSource = `
    precision highp float;

    uniform float uTime;
    uniform vec3 uResolution;
    uniform vec2 uFocal;
    uniform vec2 uRotation;
    uniform float uStarSpeed;
    uniform float uDensity;
    uniform float uHueShift;
    uniform float uSpeed;
    uniform vec2 uMouse;
    uniform float uGlowIntensity;
    uniform float uSaturation;
    uniform bool uMouseRepulsion;
    uniform float uTwinkleIntensity;
    uniform float uRotationSpeed;
    uniform float uRepulsionStrength;
    uniform float uMouseActiveFactor;
    uniform float uAutoCenterRepulsion;
    uniform bool uTransparent;

    varying vec2 vUv;

    #define NUM_LAYER 4.0
    #define STAR_COLOR_CUTOFF 0.2
    #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
    #define PERIOD 3.0

    float Hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float tri(float x) {
      return abs(fract(x) * 2.0 - 1.0);
    }

    float tris(float x) {
      float t = fract(x);
      return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
    }

    float trisn(float x) {
      float t = fract(x);
      return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float Star(vec2 uv, float flare) {
      float d = length(uv);
      float m = (0.05 * uGlowIntensity) / d;
      float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * flare * uGlowIntensity;
      uv *= MAT45;
      rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * 0.3 * flare * uGlowIntensity;
      m *= smoothstep(1.0, 0.2, d);
      return m;
    }

    vec3 StarLayer(vec2 uv) {
      vec3 col = vec3(0.0);

      vec2 gv = fract(uv) - 0.5; 
      vec2 id = floor(uv);

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 si = id + vec2(float(x), float(y));
          float seed = Hash21(si);
          float size = fract(seed * 345.32);
          float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
          float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

          float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
          float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
          float grn = min(red, blu) * seed;
          vec3 base = vec3(red, grn, blu);
          
          float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
          hue = fract(hue + uHueShift / 360.0);
          float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
          float val = max(max(base.r, base.g), base.b);
          base = hsv2rgb(vec3(hue, sat, val));

          vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

          float star = Star(gv - offset - pad, flareSize);
          vec3 color = base;

          float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
          twinkle = mix(1.0, twinkle, uTwinkleIntensity);
          star *= twinkle;
          
          col += star * size * color;
        }
      }

      return col;
    }

    void main() {
      vec2 focalPx = uFocal * uResolution.xy;
      vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

      vec2 mouseNorm = uMouse - vec2(0.5);
      
      if (uAutoCenterRepulsion > 0.0) {
        vec2 centerUV = vec2(0.0, 0.0);
        float centerDist = length(uv - centerUV);
        vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
        uv += repulsion * 0.05;
      } else if (uMouseRepulsion) {
        vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
        float mouseDist = length(uv - mousePosUV);
        vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
        uv += repulsion * 0.05 * uMouseActiveFactor;
      } else {
        vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
        uv += mouseOffset;
      }

      float autoRotAngle = uTime * uRotationSpeed;
      mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
      uv = autoRot * uv;

      uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

      vec3 col = vec3(0.0);

      for (int layerIdx = 0; layerIdx < 4; layerIdx++) {
        float i = float(layerIdx) / NUM_LAYER;
        float depth = fract(i + uStarSpeed * uSpeed);
        float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += StarLayer(uv * scale + i * 453.32) * fade;
      }

      if (uTransparent) {
        float alpha = length(col);
        alpha = smoothstep(0.0, 0.3, alpha);
        alpha = min(alpha, 1.0);
        gl_FragColor = vec4(col, alpha);
      } else {
        gl_FragColor = vec4(col, 1.0);
      }
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);

  if (!vertShader || !fragShader) {
    initDefaultAmbient(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    initDefaultAmbient(canvas);
    return;
  }

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0,
     3.0, -1.0,
    -1.0,  3.0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  // Get Uniforms
  const uTimeLoc = gl.getUniformLocation(program, "uTime");
  const uResolutionLoc = gl.getUniformLocation(program, "uResolution");
  const uFocalLoc = gl.getUniformLocation(program, "uFocal");
  const uRotationLoc = gl.getUniformLocation(program, "uRotation");
  const uStarSpeedLoc = gl.getUniformLocation(program, "uStarSpeed");
  const uDensityLoc = gl.getUniformLocation(program, "uDensity");
  const uHueShiftLoc = gl.getUniformLocation(program, "uHueShift");
  const uSpeedLoc = gl.getUniformLocation(program, "uSpeed");
  const uMouseLoc = gl.getUniformLocation(program, "uMouse");
  const uGlowIntensityLoc = gl.getUniformLocation(program, "uGlowIntensity");
  const uSaturationLoc = gl.getUniformLocation(program, "uSaturation");
  const uMouseRepulsionLoc = gl.getUniformLocation(program, "uMouseRepulsion");
  const uTwinkleIntensityLoc = gl.getUniformLocation(program, "uTwinkleIntensity");
  const uRotationSpeedLoc = gl.getUniformLocation(program, "uRotationSpeed");
  const uRepulsionStrengthLoc = gl.getUniformLocation(program, "uRepulsionStrength");
  const uMouseActiveFactorLoc = gl.getUniformLocation(program, "uMouseActiveFactor");
  const uAutoCenterRepulsionLoc = gl.getUniformLocation(program, "uAutoCenterRepulsion");
  const uTransparentLoc = gl.getUniformLocation(program, "uTransparent");

  let mouse = { x: 0.5, y: 0.5, targetActive: 0.0, active: 0.0 };
  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = 1.0 - ((e.clientY - rect.top) / rect.height);
    mouse.targetActive = 1.0;
  };
  const handleMouseLeave = () => {
    mouse.targetActive = 0.0;
  };
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseleave", handleMouseLeave);

  resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();

  let startTime = Date.now();

  function draw() {
    const elapsed = (Date.now() - startTime) * 0.001;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform1f(uTimeLoc, elapsed);
    gl.uniform3f(uResolutionLoc, width, height, width / height);
    gl.uniform2f(uFocalLoc, 0.5, 0.5);
    gl.uniform2f(uRotationLoc, 1.0, 0.0);
    gl.uniform1f(uStarSpeedLoc, (elapsed * 0.5) / 10.0);
    gl.uniform1f(uDensityLoc, 1.0);
    gl.uniform1f(uHueShiftLoc, 140.0);
    gl.uniform1f(uSpeedLoc, 1.0);

    // Mouse Active smooth dampening
    mouse.active += (mouse.targetActive - mouse.active) * 0.05;
    gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
    gl.uniform1f(uMouseActiveFactorLoc, mouse.active);

    gl.uniform1f(uGlowIntensityLoc, 0.3);
    gl.uniform1f(uSaturationLoc, 0.0);
    gl.uniform1i(uMouseRepulsionLoc, 1);
    gl.uniform1f(uTwinkleIntensityLoc, 0.3);
    gl.uniform1f(uRotationSpeedLoc, 0.1);
    gl.uniform1f(uRepulsionStrengthLoc, 2.0);
    gl.uniform1f(uAutoCenterRepulsionLoc, 0.0);
    gl.uniform1i(uTransparentLoc, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseleave", handleMouseLeave);
    originalCleanup();
  };
}

// 10. SPLASH_CURSOR WEBGL FLUID SIMULATION BACKGROUND (Auth/Login - Interactive Fluid Ripple)
function initSplashCursor(canvas) {
  let isActive = true;

  function pointerPrototype() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [0, 0, 0];
  }

  let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1440,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1.0,
    VELOCITY_DISSIPATION: 2.0,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 10.0,
    SPLAT_RADIUS: 0.19,
    SPLAT_FORCE: 12000.0,
    SHADING: true,
    COLOR_UPDATE_SPEED: 5.0,
    PAUSED: false,
    BACK_COLOR: { r: 0.5, g: 0.0, b: 0.0 },
    TRANSPARENT: true,
    RAINBOW_MODE: false,
    COLOR: '#F43F5E'
  };

  let pointers = [new pointerPrototype()];

  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false
  };
  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

  if (!gl) {
    initDefaultAmbient(canvas);
    return;
  }

  let halfFloat;
  let supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
  let formatRGBA;
  let formatRG;
  let formatR;

  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  const ext = {
    formatRGBA,
    formatRG,
    formatR,
    halfFloatTexType,
    supportLinearFiltering
  };

  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 256;
    config.SHADING = false;
  }

  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  class Material {
    constructor(vertexShader, fragmentShaderSource) {
      this.vertexShader = vertexShader;
      this.fragmentShaderSource = fragmentShaderSource;
      this.programs = [];
      this.activeProgram = null;
      this.uniforms = [];
    }
    setKeywords(keywords) {
      let hash = 0;
      for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);
      let program = this.programs[hash];
      if (program == null) {
        let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
        program = createProgram(this.vertexShader, fragmentShader);
        this.programs[hash] = program;
      }
      if (program === this.activeProgram) return;
      this.uniforms = getUniforms(program);
      this.activeProgram = program;
    }
    bind() {
      gl.useProgram(this.activeProgram);
    }
  }

  class Program {
    constructor(vertexShader, fragmentShader) {
      this.uniforms = {};
      this.program = createProgram(vertexShader, fragmentShader);
      this.uniforms = getUniforms(this.program);
    }
    bind() {
      gl.useProgram(this.program);
    }
  }

  function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program));
    return program;
  }

  function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));
    return shader;
  }

  function addKeywords(source, keywords) {
    if (!keywords) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
      keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
  }

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;

      void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `
  );

  const copyShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;

      void main () {
          gl_FragColor = texture2D(uTexture, vUv);
      }
    `
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;

      void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `
  );

  const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
        #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
  `;

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
      }
    `
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;

      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }

      void main () {
          #ifdef MANUAL_FILTERING
              vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
              vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
              vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
              vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
      }
    `,
    ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;

          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }

          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;

          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float C = texture2D(uPressure, vUv).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `
  );

  const vertexBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  const blit = (target, clear = false) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };

  let dye, velocity, divergence, curl, pressure;

  const copyProgram = new Program(baseVertexShader, copyShader);
  const clearProgram = new Program(baseVertexShader, clearShader);
  const splatProgram = new Program(baseVertexShader, splatShader);
  const advectionProgram = new Program(baseVertexShader, advectionShader);
  const divergenceProgram = new Program(baseVertexShader, divergenceShader);
  const curlProgram = new Program(baseVertexShader, curlShader);
  const vorticityProgram = new Program(baseVertexShader, vorticityShader);
  const pressureProgram = new Program(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
  const displayMaterial = new Material(baseVertexShader, displayShaderSource);

  function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    if (!dye)
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else
      dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (!velocity)
      velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else
      velocity = resizeDoubleFBO(
        velocity,
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
  }

  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push('SHADING');
    displayMaterial.setKeywords(displayKeywords);
  }

  updateKeywords();
  initFramebuffers();
  let lastUpdateTime = Date.now();
  let colorUpdateTimer = 0.0;

  function updateFrame() {
    if (!isActive) return;
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render(null);
    activeAnimationId = requestAnimationFrame(updateFrame);
  }

  function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
  }

  function resizeCanvas() {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  function updateColors(dt) {
    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
      pointers.forEach(p => {
        p.color = generateColor();
      });
    }
  }

  function applyInputs() {
    pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        splatPointer(p);
      }
    });
  }

  function step(dt) {
    gl.disable(gl.BLEND);
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  function render(target) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    drawDisplay(target);
  }

  function drawDisplay(target) {
    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;
    displayMaterial.bind();
    if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    blit(target);
  }

  function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  function clickSplat(pointer) {
    const color = generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    let dx = 10 * (Math.random() - 0.5);
    let dy = 30 * (Math.random() - 0.5);
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  function splat(x, y, dx, dy, color) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  function updatePointerMoveData(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  function updatePointerUpData(pointer) {
    pointer.down = false;
  }

  function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  function hexToRGB(hex) {
    let val = hex.replace('#', '');
    if (val.length === 3) val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
    const r = parseInt(val.slice(0, 2), 16) / 255;
    const g = parseInt(val.slice(2, 4), 16) / 255;
    const b = parseInt(val.slice(4, 6), 16) / 255;
    return { r: r * 0.15, g: g * 0.15, b: b * 0.15 };
  }

  function generateColor() {
    if (!config.RAINBOW_MODE) {
      return hexToRGB(config.COLOR);
    }
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r, g, b };
  }

  function wrap(value, min, max) {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
    else return { width: min, height: max };
  }

  function scaleByPixelRatio(input) {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  function hashCode(s) {
    if (s.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function handleMouseDown(e) {
    let pointer = pointers[0];
    let posX = scaleByPixelRatio(e.clientX);
    let posY = scaleByPixelRatio(e.clientY);
    updatePointerDownData(pointer, -1, posX, posY);
    clickSplat(pointer);
  }

  let firstMouseMoveHandled = false;
  function handleMouseMove(e) {
    let pointer = pointers[0];
    let posX = scaleByPixelRatio(e.clientX);
    let posY = scaleByPixelRatio(e.clientY);
    if (!firstMouseMoveHandled) {
      let color = generateColor();
      updatePointerMoveData(pointer, posX, posY, color);
      firstMouseMoveHandled = true;
    } else {
      updatePointerMoveData(pointer, posX, posY, pointer.color);
    }
  }

  function handleTouchStart(e) {
    const touches = e.targetTouches;
    let pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) {
      let posX = scaleByPixelRatio(touches[i].clientX);
      let posY = scaleByPixelRatio(touches[i].clientY);
      updatePointerDownData(pointer, touches[i].identifier, posX, posY);
    }
  }

  function handleTouchMove(e) {
    const touches = e.targetTouches;
    let pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) {
      let posX = scaleByPixelRatio(touches[i].clientX);
      let posY = scaleByPixelRatio(touches[i].clientY);
      updatePointerMoveData(pointer, posX, posY, pointer.color);
    }
  }

  function handleTouchEnd(e) {
    const touches = e.changedTouches;
    let pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) {
      updatePointerUpData(pointer);
    }
  }

  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('touchstart', handleTouchStart);
  window.addEventListener('touchmove', handleTouchMove, false);
  window.addEventListener('touchend', handleTouchEnd);

  updateFrame();

  const originalCleanup = cleanupBackground;
  cleanupBackground = () => {
    isActive = false;
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);

    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(indexBuffer);

    if (dye) {
      gl.deleteFramebuffer(dye.read.fbo);
      gl.deleteFramebuffer(dye.write.fbo);
      gl.deleteTexture(dye.read.texture);
      gl.deleteTexture(dye.write.texture);
    }
    if (velocity) {
      gl.deleteFramebuffer(velocity.read.fbo);
      gl.deleteFramebuffer(velocity.write.fbo);
      gl.deleteTexture(velocity.read.texture);
      gl.deleteTexture(velocity.write.texture);
    }
    if (divergence) {
      gl.deleteFramebuffer(divergence.fbo);
      gl.deleteTexture(divergence.texture);
    }
    if (curl) {
      gl.deleteFramebuffer(curl.fbo);
      gl.deleteTexture(curl.texture);
    }
    if (pressure) {
      gl.deleteFramebuffer(pressure.read.fbo);
      gl.deleteFramebuffer(pressure.write.fbo);
      gl.deleteTexture(pressure.read.texture);
      gl.deleteTexture(pressure.write.texture);
    }
    originalCleanup();
  };
}

// Attach to window for global access
window.CampusBackgrounds = {
  setPageBackground,
  cleanupBackground
};
