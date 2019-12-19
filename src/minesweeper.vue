<template>
  <div>
    <div>
      <div style="display: flex; justify-content: space-between;">
        <div>Minesweeper {{ gameStatus }}</div>
        <div style="display: flex; align-items: center;">
          <strong style="margin-right: 10px;">
            Mines: {{ mineCount }}
          </strong>
          <!--
          <md-progress-spinner md-mode="determinate" :md-diameter="30" :md-value="mineCount / mines * 100">
          </md-progress-spinner>
          -->
        </div>
      </div>
    </div>

    <div class="grid">
      <template v-for="(row, rowIndex) in minefield" v-if="cells.length == rows * columns">
        <cell
          v-for="(value, columnIndex) in row"
          :value="value"
          :api="api"
          v-on:click.native="revealCell(rowIndex, columnIndex)"
          v-on:click.native.right.prevent="onRightClickCell(getCellByCoordinates(rowIndex, columnIndex))"
        ></cell>
      </template>
    </div>

    <!--
    <minesweeper-solver :minefield="minefield" :api="api" ref="solver"></minesweeper-solver>
    <md-button v-on:click="newGame">New Game</md-button>
    -->
  </div>
</template>

<script>
import cell from './cell.vue';

var shuffle = function(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};

export default {
  components: {
    cell: cell
  },

  data: function() {
    return {
      rows: 16,
      columns: 30,
      mines: 99,
      cells: [],
      cellsInitialized: false,
      api: undefined,
      constants: {
        MINE: "!",
        FLAGGED_AS_MINE: "?",
        FLAGGED_AS_POSSIBLE_MINE: "??",
        UNREVEALED: ""
      }
    };
  },
  computed: {
    minefield: function() {
      if (this.cells.length == 0) {
        return [];
      };

      var rows = [];

      for (var rowIndex = 0; rowIndex < this.rows; rowIndex++) {
        var row = [];

        for (var columnIndex = 0; columnIndex < this.columns; columnIndex++) {
          row.push(this.getCellByCoordinates(rowIndex, columnIndex).value);
        };

        rows.push(row);
      };

      return rows;
    },

    mineCount: function() {
      return this.mines - this.cellsFlaggedAsMines.length;
    },

    remainingCellsCount: function() {
      return this.cells.filter(function(cell) {
        return cell.revealed == false
          && cell.flaggedAsMine == false
          && cell.flaggedAsPossibleMine == false;
      }).length;
    },

    cellsUnrevealedWithoutMines: function() {
      return this.cells.filter(function(cell) {
        return !cell.revealed && !cell.isMine;
      });
    },

    cellsRevealedWithMines: function() {
      return this.cells.filter(function(cell) {
        return cell.revealed && cell.isMine;
      });
    },

    cellsFlaggedAsMines: function() {
      return this.cells.filter(function(cell) {
        return cell.flaggedAsMine;
      });
    },

    gameStatus: function() {
      if (this.cellsRevealedWithMines.length > 0) {
        return "- You lose!";
      };
      if (this.cellsUnrevealedWithoutMines.length == 0) {
        return "- You win!";
      };
      return "";
    }
  },
  methods: {
    newGame: function() {
      this.cellsInitialized = false;
      this.cells = [];

      for (var rowIndex = 0; rowIndex < this.rows; rowIndex++) {
        for (var columnIndex = 0; columnIndex < this.columns; columnIndex++) {
          this.cells.push({
            row: rowIndex,
            column: columnIndex,
            revealed: false,
            isMine: false,
            flaggedAsMine: false,
            flaggedAsPossibleMine: false,
            value: ""
          });
        };
      };
    },

    revealCell: function() {
      var self = this;

      var cell;

      if (arguments.length == 1) {
        cell = arguments[0];
      } else {
        cell = self.getCellByCoordinates(arguments[0], arguments[1]);
      }

      !self.cellsInitialized && initializeCells();

      if (
        cell.revealed
        || cell.flaggedAsMine
        || cell.flaggedAsPossibleMine
      ) {
        return;
      };

      cell.revealed = true;

      cell.isMine && gameOver();

      if (!cell.isMine) {
        self.getSurroundingCells(cell).forEach(function(otherCell) {
          self.cascadeReveal(otherCell, cell);
        });
      };

      this.updateCellValue(cell);

      function initializeCells() {
        var cells = self.cells
          .filter(function(otherCell) {
            return otherCell != cell;
          })
          .map(function(otherCell) {
            return otherCell;
          });

        for (var i = 0; i < self.mines; i++) {
          shuffle(cells);
          cells.pop().isMine = true;
        }

        self.cellsInitialized = true;
      };

      function gameOver() {
        // reveal all of the mines
        self.cells
          .filter(function(otherCell) {
            return otherCell.isMine;
          })
          .forEach(function(otherCell) {
            otherCell.revealed = true;
            self.updateCellValue(otherCell);
          });
      };

      function populateMines(excludeCells) {
        var minesToPlace = self.mines;

        while (minesToPlace > 0) {
          var cellIndex = Math.floor(Math.random() * self.cells.length);
          var cell = self.cells[cellIndex];

          if (excludeCells.filter(function(excludeCell) { return excludeCell == cell; }).length > 0) {
            continue;
          };

          if (!cell.isMine) {
            cell.isMine = true;
            minesToPlace--;
          }
        };
      };
    },

    updateCellValue: function(cell) {
      cell.value = this.getCellValue(cell);
    },

    getCellValue: function(cell) {
      if (cell.revealed && cell.isMine) {
        return this.constants.MINE;
      }

      if (cell.flaggedAsMine) {
        return this.constants.FLAGGED_AS_MINE;
      }

      if (cell.flaggedAsPossibleMine) {
        return this.constants.FLAGGED_AS_POSSIBLE_MINE;
      }

      if (!cell.revealed) {
        return this.constants.UNREVEALED;
      }

      return this.getSurroundingMines(cell).length;
    },

    onRightClickCell: function(cell) {
      var self = this;

      if (cell.revealed) {
        revealSurrounding();
      } else {
        flag();
      };

      self.updateCellValue(cell);

      function flag() {
        if (cell.flaggedAsMine == true) {
          cell.flaggedAsMine = false;
          cell.flaggedAsPossibleMine = true;
        } else if (cell.flaggedAsPossibleMine) {
          cell.flaggedAsPossibleMine = false;
        } else {
          cell.flaggedAsMine = true;
        };
      };

      function revealSurrounding() {
        if (!cell.revealed) {
          return;
        };

        var surroundingCellsFlagged = self.getSurroundingCells(cell).filter(function(cell) {
          return !cell.revealed && cell.flaggedAsMine;
        });

        if (surroundingCellsFlagged.length == self.getSurroundingMines(cell).length) {
          self.getSurroundingCells(cell).forEach(function(cell) {
            self.revealCell(cell);
          });
        };
      };
    },

    flagCell: function(row, column) {
      var cell = this.getCellByCoordinates(row, column);
      cell.flaggedAsMine = true;
      this.updateCellValue(cell);
    },

    cascadeReveal: function(cell, sourceCell) {
      var self = this;

      if (
        !cell.isMine
        && !cell.revealed
        && self.getSurroundingMines(sourceCell) == 0
      ) {
        self.revealCell(cell);
        self.getSurroundingCells(cell).forEach(function(otherCell) {
          self.cascadeReveal(otherCell, cell);
        });
      };
    },

    getCellByCoordinates: function(rowIndex, columnIndex) {
      try {
        return this.cells.filter(function(cell) {
          return cell.row == rowIndex && cell.column == columnIndex;
        })[0];
      } catch (e) {
        console.error("could not find cell at coordinates", arguments, e);
      };
    },

    getSurroundingCells: function(cell) {
      return [
        // top
        this.getCellByCoordinates(cell.row - 1, cell.column),

        // top-right
        this.getCellByCoordinates(cell.row - 1, cell.column + 1),

        // right
        this.getCellByCoordinates(cell.row, cell.column + 1),

        // bottom-right
        this.getCellByCoordinates(cell.row + 1, cell.column + 1),

        // bottom
        this.getCellByCoordinates(cell.row + 1, cell.column),

        // bottom-left
        this.getCellByCoordinates(cell.row + 1, cell.column - 1),

        // left
        this.getCellByCoordinates(cell.row, cell.column - 1),

        // top-left
        this.getCellByCoordinates(cell.row - 1, cell.column - 1),
      ].filter(function(otherCell) {
        return otherCell;
      });
    },

    getSurroundingMines: function(cell) {
      return this.getSurroundingCells(cell).filter(function(otherCell) {
        return otherCell.isMine;
      });
    },

    getSurroundingCellsUnrevealedAndUnflagged: function(cell) {
      return this.getSurroundingCells(cell).filter(function(otherCell) {
        return !otherCell.revealed && !otherCell.flaggedAsMine && !otherCell.flaggedAsPossibleMine;
      });
    },

    getSurroundingCellsFlaggedAsMine: function(cell) {
      return this.getSurroundingCells(cell).filter(function(otherCell) {
        return otherCell.flaggedAsMine;
      });
    }
  },
  mounted: function() {
    this.api = {
      revealCell: this.revealCell,
      flagCell: this.flagCell,
      constants: this.constants
    };

    this.newGame();
    //setTimeout(this.solve, 500);
  }
};
</script>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(30, 1fr);
    grid-auto-rows: 1fr;
    width: 1000px;
  }
    .grid::before {
      content: '';
      width: 0;
      padding-bottom: 100%;
      grid-row: 1 / 1;
      grid-column: 1 / 1;
    }
    .grid > *:first-child {
      grid-row: 1 / 1;
      grid-column: 1 / 1;
    }

  .cell {
    display: inline-block;
    border-radius: 2px;
    border: 1px solid red;
    background-color: #607D8B;
    user-select: none;
    transition: 0.1s all;
  }
    .cell--not-revealed:hover {
      box-shadow: 0 0 2px black;
      opacity: 0.8;
    }
    .cell--revealed {
      background-color: #E0E0E0;
    }
    .cell--mine {
      background-color: #b71c1c;
      color: white;
    }
    .cell--flagged-as-mine {
      background-color: #4CAF50;
    }
    .cell--flagged-as-possible-mine {
      background-color: #FFEB3B;
    }
    .cell--incorrect {
      background-color: #FFC107 !important;
    }
</style>
