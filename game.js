/* 2028 Deluxe — 2048-style game with undo, touch, best-score persistence */
(() => {
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const newBtn  = document.getElementById('newGame');
  const undoBtn = document.getElementById('undo');
  const hintBtn = document.getElementById('hint');
  const sizeSel = document.getElementById('gridSize');

  // Game state
  let size = +localStorage.getItem('size') || 4;
  let grid, score, history = [];

  const rnd = (n) => Math.floor(Math.random()*n);

  function setupBoard() {
    boardEl.style.setProperty('--size', size);
    boardEl.innerHTML = '';
    for (let i=0;i<size*size;i++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role','gridcell');
      boardEl.appendChild(cell);
    }
  }

  function emptyCells(){
    const cells=[];
    for(let i=0;i<size*size;i++){
      if(grid[i]===0) cells.push(i);
    }
    return cells;
  }

  function addRandomTiles(n=1){
    for(let k=0;k<n;k++){
      const cells = emptyCells();
      if(!cells.length) return;
      const idx = cells[rnd(cells.length)];
      grid[idx] = Math.random() < 0.9 ? 2 : 4;
      spawnTile(idx, grid[idx]);
    }
  }

  function idxXY(r,c){ return r*size + c; }

  function saveHistory(){
    history.push({ grid: grid.slice(), score });
    if(history.length > 50) history.shift();
  }

  function restore(state){
    grid = state.grid.slice();
    score = state.score;
    drawAll();
  }

  function start(resetSize=false){
    if(resetSize){
      size = +sizeSel.value;
      localStorage.setItem('size', size);
    }
    history = [];
    grid = new Array(size*size).fill(0);
    score = 0;
    setupBoard();
    addRandomTiles(2);
    updateHUD();
    enableInputs();
  }

  function updateHUD(){
    scoreEl.textContent = score;
    const best = Math.max(+localStorage.getItem('best')||0, score);
    bestEl.textContent = best;
    localStorage.setItem('best', best);
  }

  function tilePos(i){
    const r = Math.floor(i/size);
    const c = i % size;
    const gap = 10;
    const tile = Math.min(560, window.innerWidth*0.92);
    const each = (tile - (gap*(size+1)))/size;
    const x = (gap + c*(each+gap)) + 'px';
    const y = (gap + r*(each+gap)) + 'px';
    return { x, y };
  }

  function spawnTile(i, value){
    const t = document.createElement('div');
    t.className = 'tile spawn';
    t.dataset.i = i;
    t.dataset.v = value;
    const {x,y} = tilePos(i);
    t.style.setProperty('--x', x);
    t.style.setProperty('--y', y);
    t.textContent = value;
    boardEl.appendChild(t);
  }

  function drawAll(){
    // Remove existing tiles
    Array.from(boardEl.querySelectorAll('.tile')).forEach(t=>t.remove());
    // Redraw
    for(let i=0;i<grid.length;i++){
      if(grid[i]) spawnTile(i, grid[i]);
    }
    updateHUD();
  }

  function canMove(){
    if(emptyCells().length) return true;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const v = grid[idxXY(r,c)];
        if(r+1<size && grid[idxXY(r+1,c)]===v) return true;
        if(c+1<size && grid[idxXY(r,c+1)]===v) return true;
      }
    }
    return false;
  }

  function move(dir){
    // dir: 'left','right','up','down'
    saveHistory();
    let moved=false, gained=0;

    const line = (r,c) => grid[idxXY(r,c)];
    const set  = (r,c,val) => grid[idxXY(r,c)] = val;

    const dirs = {
      left:  { r: (r)=>r, c: (c)=>c,   loopR:[0,size,1], loopC:[0,size,1] },
      right: { r: (r)=>r, c: (c)=>size-1-c, loopR:[0,size,1], loopC:[0,size,1] },
      up:    { r: (r)=>r, c: (c)=>c,   loopR:[0,size,1], loopC:[0,size,1] },
      down:  { r: (r)=>size-1-r, c: (c)=>c, loopR:[0,size,1], loopC:[0,size,1] }
    };

    const horizontal = (dir==='left'||dir==='right');

    const used = new Set();
    const tiles = Array.from(boardEl.querySelectorAll('.tile'));

    const positionsBefore = grid.map((v,i)=>({v,i}));

    // For each row/col, compress & merge
    for(let i=0;i<size;i++){
      let arr=[];
      for(let j=0;j<size;j++){
        const r = horizontal ? i : dirs[dir].r(j);
        const c = horizontal ? dirs[dir].c(j) : i;
        const val = line(r,c);
        if(val) arr.push(val);
      }
      // if moving right/down we should reverse first for merge logic
      const reverse = (dir==='right'||dir==='down');
      if(reverse) arr.reverse();

      // merge
      for(let k=0;k<arr.length-1;k++){
        if(arr[k]===arr[k+1]){
          arr[k]*=2;
          gained += arr[k];
          arr[k+1]=0;
        }
      }
      arr = arr.filter(v=>v!==0);
      while(arr.length<size) arr.push(0);
      if(reverse) arr.reverse();

      // write back
      for(let j=0;j<size;j++){
        const r = horizontal ? i : dirs[dir].r(j);
        const c = horizontal ? dirs[dir].c(j) : i;
        const prev = line(r,c);
        if(prev !== arr[j]) moved=true;
        set(r,c,arr[j]);
      }
    }

    // Animate movement by redrawing
    if(moved){
      score += gained;
      drawAll();
      addRandomTiles(1);
      updateHUD();
      if(!canMove()){
        setTimeout(()=>alert('Game over!'), 20);
      }
    } else {
      history.pop(); // revert history push if nothing moved
    }
  }

  function enableInputs(){
    // Keyboard
    window.onkeydown = (e) => {
      const k = e.key.toLowerCase();
      if(['arrowleft','a'].includes(k)) return move('left');
      if(['arrowright','d'].includes(k)) return move('right');
      if(['arrowup','w'].includes(k)) return move('up');
      if(['arrowdown','s'].includes(k)) return move('down');
    };

    // Touch
    let sx=0, sy=0, tracking=false;
    boardEl.addEventListener('touchstart', (e)=>{
      const t = e.touches[0]; sx=t.clientX; sy=t.clientY; tracking=true;
    }, {passive:true});
    boardEl.addEventListener('touchmove', (e)=>e.preventDefault(), {passive:false});
    boardEl.addEventListener('touchend', (e)=>{
      if(!tracking) return;
      tracking=false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if(Math.hypot(dx,dy) < 20) return;
      if(Math.abs(dx) > Math.abs(dy)) move(dx>0?'right':'left');
      else move(dy>0?'down':'up');
    });
  }

  // Buttons
  newBtn.addEventListener('click', ()=> start(true));
  undoBtn.addEventListener('click', ()=> {
    const last = history.pop();
    if(last) restore(last);
  });
  hintBtn.addEventListener('click', ()=> {
    // Simple heuristic: test all directions and pick the one that changes the board and yields the highest score gain
    const dirs = ['left','right','up','down'];
    let best=null, bestGain=-1;
    for(const d of dirs){
      const snapshot = { grid: grid.slice(), score };
      // simulate
      const before = grid.slice();
      move(d);
      const gain = score - snapshot.score;
      // restore
      grid = snapshot.grid;
      score = snapshot.score;
      drawAll();
      if(JSON.stringify(before)!==JSON.stringify(grid) && gain>=bestGain){
        bestGain=gain; best=d;
      }
    }
    if(best){
      hintBtn.textContent = `Hint: ${best.toUpperCase()}`;
      setTimeout(()=>hintBtn.textContent='Hint', 1500);
    }
  });

  // Init
  sizeSel.value = size.toString();
  start();
})();
