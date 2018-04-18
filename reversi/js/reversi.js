BOARD_SIZE = 8;
MAX_TURNS = 60;

NONE = 0;
UPPER = 1;
UPPER_LEFT = 2;
LEFT = 4;
LOWER_LEFT = 8;
LOWER = 16;
LOWER_RIGHT = 32;
RIGHT = 64;
UPPER_RIGHT = 128;


class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    static create_by_str(coord) {
      if (coord == null || coord.length < 2) {
        throw new TypeError('The argument must be Reversi style coordinates!');
      }
      x = coord.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
      y = coord.charCodeAt(1) - '1'.charCodeAt(0) + 1;
      return new Point(x, y);
    }
}

class Disc extends Point {
  static get EMPTY() { return 0; }
  static get WHITE() { return -1; }
  static get BLACK() { return 1; }
  static get WALL()  { return  2; }

  constructor(x, y, color) {
    super(x, y);
    this.color = color;
  }
}

class ColorStorage {

  constructor(color) {
    this.data = [0, 0, 0];
  }

  get(color) {
    return this.data[color + 1];
  }

  set(color, value) {
    this.data[color + 1] = value;
  }
}


class Board {
  constructor() {
    this.rawBoard = this._newRawBoard();
    this.turns = 0;
    this.currentColor = Disc.BLACK;
    this.updateLog = [];
    this.movablePos = [];
    for (var i = 0; i < MAX_TURNS + 1; i++) {
      this.movablePos.push([]);
    }
    this.movableDir = this._newMovableDir();
    this.discs = new ColorStorage();
    this.init();
  }

  _newRawBoard() {
    const rawBoard = new Array(BOARD_SIZE + 2);
    for (var r = 0; r < BOARD_SIZE + 2; r++) {
        rawBoard[r] = new Array(BOARD_SIZE + 2).fill(0);
    }
    return rawBoard;
  }

  _newMovableDir() {
    const movableDir = new Array(MAX_TURNS);
    for (var t = 0; t <= MAX_TURNS; t++) {
      movableDir[t] = new Array(BOARD_SIZE + 2);
      for (var r = 0; r < BOARD_SIZE + 2; r++) {
        movableDir[t][r] = new Array(BOARD_SIZE + 2).fill(0);
      }
    }
    return movableDir;
  }

  _checkMobility(disc) {
    if (this.rawBoard[disc.x][disc.y] != Disc.EMPTY) {
      return NONE;
    }
    let dir = NONE;

    const dirs = [
      {bit: UPPER,       dx:  0, dy: -1},
      {bit: UPPER_LEFT,  dx: -1, dy: -1},
      {bit: LEFT,        dx: -1, dy:  0},
      {bit: LOWER_LEFT,  dx: -1, dy:  1},
      {bit: LOWER,       dx:  0, dy:  1},
      {bit: LOWER_RIGHT, dx:  1, dy:  1},
      {bit: RIGHT,       dx:  1, dy:  0},
      {bit: UPPER_RIGHT, dx:  1, dy: -1},
    ];

    for (let k in dirs) {
      const d = dirs[k];
      if (this.rawBoard[disc.x + d.dx][disc.y + d.dy] == -disc.color) {
        let x = disc.x + d.dx * 2;
        let y = disc.y + d.dy * 2;
        while (this.rawBoard[x][y] == -disc.color) {
          x += d.dx;
          y += d.dy;
        }
        if (this.rawBoard[x][y] == disc.color) {
          dir |= d.bit;
        }
      }
    }
    return dir;
  }

  move(point) {
    if (point.x <= 0 || point.x > BOARD_SIZE) {
      return false;
    }
    if (point.y <= 0 || point.y > BOARD_SIZE) {
      return false;
    }
    if (this.movableDir[this.turns][point.x][point.y] == NONE) {
      return false;
    }
    this.flipDiscs(point);

    this.turns++;
    this.currentColor *= -1;
    this.initMovable();

    return true;
  }

  initMovable() {
    this.movablePos[this.turns] = [];
    for (let y = 1; y <= BOARD_SIZE; y++) {
      for (let x = 1; x <= BOARD_SIZE; x++) {
        const disc = new Disc(x, y, this.currentColor);
        const dir = this._checkMobility(disc);
        if (dir != NONE) {
          this.movablePos[this.turns].push(disc);
        }
        this.movableDir[this.turns][x][y] = dir;
      }
    }
  }

  flipDiscs(point) {
    const operation = new Disc(point.x, point.y, this.currentColor);
    const dir = this.movableDir[this.turns][point.x][point.y];

    const update = [];
    this.rawBoard[point.x][point.y] = this.currentColor;
    update.push(operation);

    const dirs = [
      {bit: UPPER,       dx:  0, dy: -1},
      {bit: UPPER_LEFT,  dx: -1, dy: -1},
      {bit: LEFT,        dx: -1, dy:  0},
      {bit: LOWER_LEFT,  dx: -1, dy:  1},
      {bit: LOWER,       dx:  0, dy:  1},
      {bit: LOWER_RIGHT, dx:  1, dy:  1},
      {bit: RIGHT,       dx:  1, dy:  0},
      {bit: UPPER_RIGHT, dx:  1, dy: -1},
    ];
    for (let k in dirs) {
      const d = dirs[k];
      if ((dir & d.bit) != NONE) {
        let x = point.x + d.dx;
        let y = point.y + d.dy;
        while (this.rawBoard[x][y] != this.currentColor) {
          this.rawBoard[x][y] = this.currentColor;
          update.push(new Disc(x, y, this.currentColor));
          x += d.dx;
          y += d.dy;
        }
      }
    }

    // 石の数を更新
    const discDiff = update.length;
    this.discs.set(this.currentColor, this.discs.get(this.currentColor) + discDiff);
    this.discs.set(-this.currentColor, this.discs.get(-this.currentColor) - (discDiff - 1));
    this.discs.set(Disc.EMPTY, this.discs.get(Disc.EMPTY) - 1);

    this.updateLog.push(update);
  }

  isGameOver() {
    // 60手に達していたらゲームオーバー
    if (this.turns == MAX_TURNS) {
      return true;
    }
    // 打てる手があるならゲームオーバーではない
    if (this.movablePos[this.turns].length > 0) {
      return false;
    }
    // 現在の手番と逆の色が打てるかどうか調べる
    const disc = new Disc(0, 0, -this.currentColor);
    for (let x = 1; x <= BOARD_SIZE; x++) {
      disc.x = x;
      for (let y = 1; y <= BOARD_SIZE; y++) {
        disc.y = y;
        if (this._checkMobility(disc) != NONE) {
          return false;
        }
      }
    }
    return true;
  }

  passTurn() {
    // 打つ手があるならパスはできない
    if (this.movablePos[this.turns] > 0) {
      return false;
    }
    // ゲームが終了しているならパスはできない
    if (this.isGameOver()) {
      return false;
    }
    this.currentColor *= -1;
    this.updateLog.push([]);
    this.initMovable();
    return true;
  }

  undo() {
    // ゲーム開始地点ならもう戻れない
    if (this.turns == 0) {
      return false;
    }
    this.currentColor *= -1;
    const update = this.updateLog.pop();

    // 前回がパスかどうかで場合分け
    if (update.length == 0) {
      // 前回はパスだった
      // movablePos と movableDir を再構築
      this.movablePos[this.turns] = [];
      for (let x = 1; x < BOARD_SIZE + 1; x++) {
        for (let y = 1; y < BOARD_SIZE + 1; y++) {
          this.movableDir[this.turns][x][y] = NONE;
        }
      }
    } else {
      // 前回はパスでない
      this.turns -= 1;
      // 石をもとに戻す
      let p = update[0];
      this.rawBoard[p.x][p.y] = Disc.EMPTY;
      for (let i = 1; i < update.length; i++) {
        p = update[i];
        this.rawBoard[p.x][p.y] = -this.currentColor;
      }

      // 石数の更新
      const discDiff = update.length;
      this.discs.set(this.currentColor, this.discs.get(this.currentColor) - discDiff);
      this.discs.set(-this.currentColor, this.discs.get(-this.currentColor) + discDiff - 1);
      this.discs.set(Disc.EMPTY, this.discs.get(Disc.EMPTY) + 1);
    }
    return true;
  }

  init() {
    // 全マスを空きマスに設定
    for (let x = 1; x <= BOARD_SIZE; x++) {
      for (let y = 1; y <= BOARD_SIZE; y++) {
        this.rawBoard[x][y] = Disc.EMPTY
      }
    }

    // 壁の設定
    for (let y = 0; y < BOARD_SIZE + 2; y++) {
      this.rawBoard[0][y] = Disc.WALL;
      this.rawBoard[BOARD_SIZE + 1][y] = Disc.WALL;
    }

    for (let x = 0; x < BOARD_SIZE + 2; x++) {
      this.rawBoard[x][0] = Disc.WALL;
      this.rawBoard[x][BOARD_SIZE + 1] = Disc.WALL;
    }

    // 初期配置
    this.rawBoard[4][4] = Disc.WHITE;
    this.rawBoard[5][5] = Disc.WHITE;
    this.rawBoard[4][5] = Disc.BLACK;
    this.rawBoard[5][4] = Disc.BLACK;

    // 石数の初期設定
    this.discs.set(Disc.BLACK, 2);
    this.discs.set(Disc.WHITE, 2);
    this.discs.set(Disc.EMPTY, BOARD_SIZE * BOARD_SIZE - 4);

    this.turns = 0;
    this.currentColor = Disc.BLACK;

    // update をすべて消去
    this.updateLog = [];

    this.initMovable();
  }

  getColor(p) {
    return this.rawBoard[p.x][p.y];
  }

  getMovablePos() {
    return this.movablePos[this.turns];
  }

  getUpdate() {
    if (this.updateLog.length == 0) {
      return [];
    }
    return this.updateLog[this.updateLog.length - 1];
  }

  countDisc(color) {
    return this.discs.get(color);
  }
}

class PerfectEvaluator {

  evaluate(board) {
    const discDiff = board.currentColor * (board.countDisc(Disc.BLACK) - board.countDisc(Disc.WHITE));
    return discDiff;
  }
}

class PointTableEvaluator {
  constructor() {
    this.pointTable = [
      [100, -50,  10,   0,   0,  10, -50, 100],
      [-50, -70,  -5, -10, -10,  -5, -70, -50],
      [ 10,  -5, -10,  -5,  -5, -10,  -5,  10],
      [0,   -10,  -5,   0,   0,  -5, -10,   0],
      [0,   -10,  -5,   0,   0,  -5, -10,   0],
      [10,   -5, -10,  -5,  -5, -10,  -5,  10],
      [-50, -70,  -5, -10, -10,  -5, -70, -50],
      [100, -50,  10,   0,   0,  10, -50, 100],
    ];
  }

  evaluate(board) {
    let point = 0;
    for (let x = 1; x <= BOARD_SIZE; x++) {
      for (let y = 1; y <= BOARD_SIZE; y++) {
        point += board.currentColor * board.rawBoard[x][y] * this.pointTable[x - 1][y - 1];
      }
    }
    return point;
  }
}

class AI {
  static get presearch_depth() { return 3; };
  static get normal_depth() { return 5; };
  static get wld_depth() { return 10; };
  static get perfect_depth() { return 7; };
}

class Move extends Point {
  constructor(e, x=0, y=0) {
    super(x, y);
    this.eval = e;
  }
}

class AlphaBetaAI extends AI {

  constructor() {
    super();
    this.perfectEvaluator = new PerfectEvaluator();
    this.pointTableEvaluator = new PointTableEvaluator();
  }

  move(board) {
    const movables = board.getMovablePos();
    if (movables.length == 0) {
      // 打てる箇所がなければパス
      board.passTurn();
      return;
    }
    if (movables.length == 1) {
      // 打てる箇所が一箇所だけなら探索は行わず、即座に打って返る
      board.move(movables[0]);
      return;
    }
    let limit = 0;
    if (MAX_TURNS - board.turns <= AI.wld_depth) {
      limit = Number.MAX_VALUE;
    } else {
      limit = AI.normal_depth;
    }
    let eval_max = -Number.MAX_VALUE;
    let p = null;
    for (let k in movables) {
      let m = movables[k];
      board.move(m);
      const eval_ = -this.alphabeta(board, limit - 1, -Number.MAX_VALUE, Number.MAX_VALUE);
      board.undo();
      if (eval_ > eval_max) {
        eval_max = eval_;
        p = m;
      }
    }
    board.move(p);
  }

  alphabeta(board, limit, alpha, beta) {
    // 深さ制限に達したら評価値を返す
    if (board.isGameOver() || limit <= 0) {
      return this.evaluate(board);
    }
    const pos = board.getMovablePos();
    if (pos.length == 0) {
      // パスの場合
      board.passTurn();
      const eval_ = -this.alphabeta(board, limit, -beta, -alpha);
      board.undo();
      return eval_;
    }

    for (let k in pos) {
      let p = pos[k];
      board.move(p);
      const eval_ = -this.alphabeta(board, limit - 1, -beta, -alpha);
      board.undo();
      alpha = Math.max(alpha, eval_);
      if (alpha >= beta) {
        // ベータ刈り
        return alpha;
      }
    }
    return alpha;
  }

  sort(board, movables, limit) {
    const moves = [];
    for (p in movables) {
      board.move(p);
      const eval_ = -this.alphabeta(board, limit - 1, -Number.MAX_VALUE, Number.MAX_VALUE);
      board.undo();
      const move = new Move(eval_, p.x, p.y);
      moves.add(move);
    }
    moves.sort(function(a, b) { return a.eval - b.eval; });
    movables.length = 0;
    for (p in moves) {
      movables.append(p);
    }
  }

  evaluate(board) {
    if (MAX_TURNS - board.turns > AI.perfect_depth) {
      return this.pointTableEvaluator.evaluate(board);
    } else {
      return this.perfectEvaluator.evaluate(board);
    }
  }
}

class ReversiGame {
  constructor() {
    this.board = new Board();
    this.ai = new AlphaBetaAI();
    this.isPlayerTurn = true;
  }

  redrawBoard() {
    const boardTable = $('#reversi_board');
    boardTable.empty();
    for (let y = 1; y <= BOARD_SIZE; y++) {
      const row = $('<tr>', { class: 'board_row' });
      for (let x = 1; x <= BOARD_SIZE; x++) {
        const cell = $('<td>', { class: 'board_cell' });
        cell.data('x', x);
        cell.data('y', y);
        cell.click(this.onClickCell.bind(this));
        const p = new Point(x, y);
        if (this.board.getColor(p) == Disc.BLACK) {
          const d = $('<div>', { class: 'disc black' });
          cell.append(d);
        } else if (this.board.getColor(p) == Disc.WHITE) {
          const d = $('<div>', { class: 'disc white' });
          cell.append(d);
        }
        row.append(cell);
      }
      boardTable.append(row);
    }
  }

  onNextTurn() {
    if (this.board.isGameOver()) {
      setTimeout(() => {
        alert('黒：'
         + this.board.countDisc(Disc.BLACK)
         + ' 白：'
         + this.board.countDisc(Disc.WHITE)
         + "\n おわり！！");
      }, 100);
      return;
    }
    setTimeout(() => {
      if (this.isPlayerTurn) {
        this.isPlayerTurn = false;
        this.onAITurn();
      } else {
        this.isPlayerTurn = true;
        this.onPlayerTurn();
      }
    }, 0);
  }
  onPlayerTurn() {
    if (this.board.getMovablePos().length == 0) {
      alert('あなたはパスです');
      this.board.passTurn();
      this.onNextTurn();
    }
  }
  onClickCell(e) {
    if (!this.isPlayerTurn) {
      return;
    }
    const x = $(e.currentTarget).data('x');
    const y = $(e.currentTarget).data('y');
    const p = new Point(x, y);
    if (!this.board.move(p)) {
      alert('そこには置けません！');
      return;
    }
    this.redrawBoard();
    setTimeout(function() {
      this.onNextTurn();
    }.bind(this), 100)
  }

  onAITurn() {
    if (this.board.getMovablePos().length == 0) {
      setTimeout(function() {
        alert('コンピューターはパスです');
      }, 100);
    }
    this.ai.move(this.board);
    this.redrawBoard();
    this.onNextTurn();
  }

  main() {
    const board = new Board();
    this.redrawBoard();
  }
}

$(function() {
  const reversi = new ReversiGame();
  reversi.main();
});
