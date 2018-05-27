// TODO: make this work like MS minesweeper where the mines are placed before you click, and the first click moves the mine to the top-left-most cell if it is a mine
(function() {
  Vue.use(VueMaterial.default);
})();

(function() {
  document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
  });
})();

(function() {
  window.shuffle = function(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }
})();

(function() {
  Vue.component("cell", {
    template: "#cellTemplate",

    props: ["value"]
  });

  Vue.component("minesweeper", {
    template: "#minesweeperTemplate",
    data: function() {
      return {
        rows: 16,
        columns: 30,
        mines: 99,
        cells: [],
        cellsInitialized: false,
        api: undefined
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
        // TODO: can these magic strings be constants?

        if (cell.revealed && cell.isMine) {
          return "!";
        }

        if (cell.flaggedAsMine) {
          return "?";
        }

        if (cell.flaggedAsPossibleMine) {
          return "??";
        }

        if (!cell.revealed) {
          return "";
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
        flagCell: this.flagCell
      };

      this.newGame();
      //setTimeout(this.solve, 500);
    }
  });

  Vue.component("minesweeper-solver", {
    template: "#solverTemplate",

    props: ["minefield", "api"],

    computed: {
      cells: function() {
        var cells = [];

        (this.minefield || []).forEach(function(row, rowIndex) {
          row.forEach(function(value, columnIndex) {
            cells.push({
              value: value,
              row: rowIndex,
              column: columnIndex
            });
          });
        });

        return cells;
      },

      isNewGame: function() {
        return this.cells.filter(function(cell) {
          return cell.value.length != 0;
        }).length == 0;
      }
    },

    methods: {
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

      getCellByCoordinates: function(rowIndex, columnIndex) {
        return this.cells.find(function(cell) {
          return cell.row == rowIndex && cell.column == columnIndex;
        });
      },

      solve: function() {
        var self = this;

        var startingState = JSON.stringify(self.cells);
        self.solveStep();

        setTimeout(function() {
          if (JSON.stringify(self.cells) != startingState) {
            self.solve();
          }
        }, 0);
      },

      solveStep: function() {
        if (this.isNewGame) {
          this.revealFirstCell();
        }

        this.placeFlags();
        this.revealCells();
        this.solveWithPossibleFlags();
      },

      revealFirstCell: function() {
        var randomCell = this.cells[Math.floor(Math.random()*this.cells.length)];
        this.api.revealCell(randomCell.row, randomCell.column);
      },

      placeFlags: function() {
        var self = this;

        // simple flags
        self.cells
          .filter(function(cell) {
            return Number.isInteger(cell.value);
          })
          .forEach(function(cell) {
            var unrevealedSurroundingCells = self.getSurroundingCells(cell).filter(function(otherCell) {
              return !Number.isInteger(otherCell.value);
            });

            if (unrevealedSurroundingCells.length == cell.value) {
              unrevealedSurroundingCells.forEach(function(otherCell) {
                self.api.flagCell(otherCell.row, otherCell.column);
              });
            }
          });
      },

      revealCells: function() {
        var self = this;

        self.cells
          .filter(function(cell) {
            return Number.isInteger(cell.value);
          })
          .forEach(function(cell) {
            var surroundingCells = self.getSurroundingCells(cell);

            var flaggedSurroundingCells = surroundingCells.filter(function(otherCell) {
              return otherCell.value == "?";
            });

            if (flaggedSurroundingCells.length == cell.value) {
              surroundingCells
                .filter(function(otherCell) {
                  return String(otherCell.value).length == 0;
                })
                .forEach(function(otherCell) {
                  self.api.revealCell(otherCell.row, otherCell.column);
                });
            }
          });
      },

      solveWithPossibleFlags: function() {
        var self = this;

        var cells = self.cells.map(decorateCell);

        cells
          .filter(cellHasUnknownSurroundingMines)
          .forEach(function(rootCell) {
            cells
              .filter(cellHasUnknownSurroundingMines)
              .filter(cellIsNotRootCell)
              .filter(cellSurroundsAllPotentialMines)
              .forEach(function(cell) {
                if (cell.value == cell.flaggedSurroundingCells.length - rootCell.unknownSurroundingCells.length) {
                  cell.surroundingCells
                    .filter(cellIsNotPotentialMine)
                    .forEach(function(surroundingCell) {
                      self.api.revealCell(surroundingCell.row, surroundingCell.column);
                    });
                }
              });

            function cellSurroundsAllPotentialMines(cell) {
              var cellIsSurroundedByAllPotentialMines = true;

              rootCell.unknownSurroundingCells.forEach(function(potentialMineCell) {
                if (
                  !self.getSurroundingCells(cell).find(function(surroundingCell) {
                    return surroundingCell.row == potentialMineCell.row && surroundingCell.column == potentialMineCell.column;
                  })
                ) {
                  cellIsSurroundedByAllPotentialMines = false;
                }
              });

              return cellIsSurroundedByAllPotentialMines;
            };

            function cellIsNotRootCell(cell) {
              return cell != rootCell;
            };

            function cellIsNotPotentialMine(cell) {
              return !rootCell.unknownSurroundingCells.find(function(surroundingCell) {
                return surroundingCell.row == cell.row && surroundingCell.column == cell.column;
              });
            };
          });

        function decorateCell(cell) {
          cell = JSON.parse(JSON.stringify(cell));

          cell.surroundingCells = self.getSurroundingCells(cell);

          cell.flaggedSurroundingCells = cell.surroundingCells.filter(function(otherCell) {
            return otherCell.value == "?";
          });

          cell.unknownSurroundingCells = cell.surroundingCells.filter(function(otherCell) {
            return String(otherCell.value).length == 0;
          });

          return cell;
        };

        function cellHasUnknownSurroundingMines(cell) {
          return Number.isInteger(cell.value) && cell.value > 0 && cell.unknownSurroundingCells.length > 0;
        };
      }
    }
  });

  var app = new Vue({
    el: "#app",
    data: {
      games: [{}]
    },
    methods: {
    }
  });

  window.app = app; // TODO

})();
