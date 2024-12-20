document.addEventListener('DOMContentLoaded', () => {
    // 1. Szöveg kirajzolása a rejtett canvas-ra
    const textCanvas = document.getElementById('textCanvas');
    const ctx = textCanvas.getContext('2d');
  
    // Háttérszín (sötétkék, retró hangulat)
    ctx.fillStyle = '#001d3d';
    ctx.fillRect(0,0,textCanvas.width,textCanvas.height);
  
    // Szöveg stílusa
    ctx.fillStyle = '#00ff99';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
  
    const centerX = textCanvas.width/2;
    let y = textCanvas.height/2 - 80;
  
    // Cím
    ctx.fillStyle='#00ff99';
    ctx.fillText('KARÁCSONYI ARCADE', centerX, y);
    y += 60;
  
    // Készítők
    ctx.fillStyle='#ffeb3b';
    ctx.fillText('Készítők:', centerX, y);
    y += 40;
    ctx.fillStyle='#fff';
    ctx.fillText('Hópehely Studio', centerX, y); y+=30;
    ctx.fillText('Pixelgrafika: CandyCane Arts', centerX, y); y+=30;
    ctx.fillText('Köszönjük, hogy velünk vagy!', centerX, y); y+=60;
  
    // Vissza
    ctx.fillStyle='#ff4444';
    ctx.fillText('Nyomj [Esc] a visszalépéshez', centerX, y);
  
    // 2. WebGL initializálás
    const glcanvas = document.getElementById('glcanvas');
    const gl = glcanvas.getContext('webgl') || glcanvas.getContext('experimental-webgl');
    if (!gl) {
      alert('A böngésző nem támogatja a WebGL-t.');
      return;
    }
  
    // Vertex shader (egyszerű)
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
      varying highp vec2 vTextureCoord;
      void main(void) {
        gl_Position = aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `;
  
    // Fragment shader a CRT effektért
    const fsSource = `
      precision highp float;
  
      varying highp vec2 vTextureCoord;
      uniform sampler2D uSampler;
  
      const float barrelDistortion = 0.15;
      const float vignette = 0.5;
      const float scanlineIntensity = 0.15;
      const float aberration = 0.003;
  
      vec2 barrelDistort(vec2 coord) {
        vec2 cc = coord - 0.5;
        float r = dot(cc, cc)*barrelDistortion;
        return coord + cc * r;
      }
  
      void main(void) {
        vec2 uv = vTextureCoord;
        uv = barrelDistort(uv);
  
        if (uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) {
          gl_FragColor = vec4(0.0,0.0,0.0,1.0);
          return;
        }
  
        float r = texture2D(uSampler, uv+vec2(aberration,0.0)).r;
        float g = texture2D(uSampler, uv).g;
        float b = texture2D(uSampler, uv-vec2(aberration,0.0)).b;
        vec3 color = vec3(r,g,b);
  
        // Scanline
        float scanline = sin(uv.y * 800.0);
        color *= mix(1.0, 0.7, scanlineIntensity * (1.0 - (scanline*0.5+0.5)));
  
        // Vignettálás
        vec2 dist = (uv - 0.5);
        float len = dot(dist, dist);
        color *= 1.0 - len*vignette;
  
        gl_FragColor = vec4(color,1.0);
      }
    `;
  
    function loadShader(gl,type,source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        console.error('Shader hiba:',gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
  
    const vertexShader = loadShader(gl,gl.VERTEX_SHADER,vsSource);
    const fragmentShader = loadShader(gl,gl.FRAGMENT_SHADER,fsSource);
  
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram,vertexShader);
    gl.attachShader(shaderProgram,fragmentShader);
    gl.linkProgram(shaderProgram);
    if(!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS)) {
      console.error('Program hiba:',gl.getProgramInfoLog(shaderProgram));
    }
    gl.useProgram(shaderProgram);
  
    const programInfo = {
      program: shaderProgram,
      attribLocations:{
        vertexPosition: gl.getAttribLocation(shaderProgram,'aVertexPosition'),
        textureCoord: gl.getAttribLocation(shaderProgram,'aTextureCoord'),
      },
      uniformLocations:{
        uSampler: gl.getUniformLocation(shaderProgram,'uSampler'),
      }
    };
  
    const positions = [
      -1.0,-1.0,
       1.0,-1.0,
      -1.0, 1.0,
       1.0, 1.0,
    ];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);
  
    const texCoords = [
      0.0,0.0,
      1.0,0.0,
      0.0,1.0,
      1.0,1.0,
    ];
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texCoords),gl.STATIC_DRAW);
  
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
    const indices=[0,1,2,2,1,3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
  
    function drawScene() {
      gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
      gl.clearColor(0,0,0,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
  
      gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition,2,gl.FLOAT,false,0,0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  
      gl.bindBuffer(gl.ARRAY_BUFFER,texCoordBuffer);
      gl.vertexAttribPointer(programInfo.attribLocations.textureCoord,2,gl.FLOAT,false,0,0);
      gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
  
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(programInfo.uniformLocations.uSampler,0);
  
      gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
      requestAnimationFrame(drawScene);
    }
  
    drawScene();
  
    // Vissza gomb: [Esc]-re reagál
    document.addEventListener('keydown',(e)=>{
      if(e.key === 'Escape') {
        alert('Visszalépés...');
        // Itt végrehajthatsz egy akciót (pl. window.location = '...';)
      }
    });
  });
  