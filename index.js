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
  var app;

  Vue.component("cell", {
    template: "#cellTemplate",

    props: [
      "row",
      "column",
      "revealed",
      "incorrect",
      "isMine",
      "flaggedAsMine",
      "flaggedAsPossibleMine"
    ],

    computed: {
      value: function() {
        if (this.revealed && !this.isMine) {
          return app.getSurroundingMines(this).length;
        }
      }
    }
  });

  app = new Vue({
    el: "#app",
    data: {
      rows: 16,
      columns: 30,
      mines: 99,
      cells: [],
      cellsInitialized: false
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
            row.push(this.getCellByCoordinates(rowIndex, columnIndex));
          };

          rows.push(row);
        };

        return rows;
      },

      /*
      solveMinefield: function() {
        return this.minefield
          .map(function(row) {
            return row
              .map(function(cell) {
              });
          });
      },
      */

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
      reload: function() {
        location.reload();
      },

      newGame: function() {
        this.cellsInitialized = false;
        this.cells = [];

        for (var rowIndex = 0; rowIndex < this.rows; rowIndex++) {
          for (var columnIndex = 0; columnIndex < this.columns; columnIndex++) {
            this.cells.push({
              row: rowIndex,
              column: columnIndex,
              revealed: false,
              incorrect: false,
              isMine: false,
              flaggedAsMine: false,
              flaggedAsPossibleMine: false
            });
          };
        };
      },

      revealCell: function(cell) {
        var self = this;

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
            });

          // update incorrect cells (flagged as mine, but not a mine)
          self.cells
            .filter(function(otherCell) {
              return otherCell.flaggedAsMine && !otherCell.isMine;
            })
            .forEach(function(otherCell) {
              otherCell.incorrect = true;
            });
        };

        if (!cell.isMine) {
          self.getSurroundingCells(cell).forEach(function(otherCell) {
            self.cascadeReveal(otherCell, cell);
          });
        };

        function populateMines(excludeCells) {
          var minesToPlace = self.mines;

          while (minesToPlace > 0) {
            var cellIndex = Math.floor(Math.random() * self.cells.length);
            var cell = self.cells[cellIndex];

            if (excludeCells.filter(function(excludeCell) { return excludeCell == cell; }).length > 0) {
              console.log("skipping");
              continue;
            };

            if (!cell.isMine) {
              cell.isMine = true;
              minesToPlace--;
            }
          };
        };
      },

      flagCell: function(cell) {
        var self = this;

        if (cell.revealed) {
          revealSurrounding();
        } else {
          flag();
        };

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

      cascadeReveal: function(cell, sourceCell) {
        var self = this;

        if (
          !cell.isMine
          && !cell.revealed
          && self.getSurroundingMines(sourceCell) == 0
        ) {
          cell.revealed = true;
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

      solveFlag: function() {
        var self = this;

        this.cells
          .filter(function(cell) {
            return cell.revealed;
          })
          .forEach(function(cell) {
            var unrevealedSurroundingCells = self.getSurroundingCells(cell).filter(function(otherCell) {
              return !otherCell.revealed;
            });

            if (unrevealedSurroundingCells.length == self.getSurroundingMines(cell).length) {
              unrevealedSurroundingCells.forEach(function(otherCell) {
                otherCell.flaggedAsMine = true;
              });
            };
          });
      },

      solveReveal: function() {
        var self = this;

        var cellsFlaggedAsPossibleMine = self.cells.filter(function(cell) {
          return cell.flaggedAsPossibleMine;
        });

        this.cells
          .filter(function(cell) {
            return cell.revealed;
          })
          .forEach(function(cell) {
            var flaggedSurroundingCells = self.getSurroundingCells(cell).filter(function(otherCell) {
              return otherCell.flaggedAsMine;
            });

            if (flaggedSurroundingCells.length == self.getSurroundingMines(cell).length) {
              self.getSurroundingCells(cell)
                .filter(function(otherCell) {
                  return !otherCell.revealed && !otherCell.flaggedAsMine;
                })
                .forEach(function(otherCell) {
                  self.revealCell(otherCell);
                });
            };
          });
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

      // TODO: refactor/move this
      getSurroundingCellsUnrevealedAndUnflagged: function(cell) {
        return this.getSurroundingCells(cell).filter(function(otherCell) {
          return !otherCell.revealed && !otherCell.flaggedAsMine && !otherCell.flaggedAsPossibleMine;
        });
      },

      // TODO: refactor/move this
      getSurroundingCellsFlaggedAsMine: function(cell) {
        return this.getSurroundingCells(cell).filter(function(otherCell) {
          return otherCell.flaggedAsMine;
        });
      },

      solveWithPossibleFlags: function() {
        var self = this;

        removeAllPossibleFlags();

        getCellsWithUnknownMines()
          .forEach(function(cell) {
            var surroundingCellsUnrevealedAndUnflagged = self.getSurroundingCellsUnrevealedAndUnflagged(cell);

            surroundingCellsUnrevealedAndUnflagged.forEach(function(otherCell) {
              otherCell.flaggedAsPossibleMine = true;
            });

            self.solveOneStep();

            surroundingCellsUnrevealedAndUnflagged.forEach(function(otherCell) {
              otherCell.flaggedAsPossibleMine = false;
            });
          });

        function removeAllPossibleFlags() {
          self.cells
            .filter(function(cell) {
              return cell.flaggedAsPossibleMine;
            })
            .forEach(function(cell) {
              cell.flaggedAsPossibleMine = false;
            });
        };

        function getCellsWithUnknownMines() {
          return self.cells
            .filter(function(cell) {
              return cell.revealed && self.getSurroundingMines(cell).length > self.getSurroundingCellsFlaggedAsMine(cell).length;
            });
        };
      },

      solveOneStep: function() {
        this.solveFlag();
        this.solveReveal();
      },

      solve: function() {
        var self = this;

        var flaggedCells_before = self.cells.filter(function(cell) {
          return cell.flaggedAsMine;
        });
        var revealedCells_before = self.cells.filter(function(cell) {
          return cell.flaggedAsMine;
        });

        self.solveFlag()

        self.solveReveal();

        var flaggedCells_after = self.cells.filter(function(cell) {
          return cell.flaggedAsMine;
        });
        var revealedCells_after = self.cells.filter(function(cell) {
          return cell.flaggedAsMine;
        });

        if (flaggedCells_before.length + revealedCells_before.length != flaggedCells_after.length + revealedCells_after.length) {
          setTimeout(self.solve, 100);
        } else {
          var cells = self.cells.filter(function(cell) {
            return !cell.revealed && !cell.flaggedAsMine;
          });

          var cell = cells[Math.floor(Math.random()*cells.length)];

          self.revealCell(cell);

          if (cell.isMine) {
            // lost
            setTimeout(self.reload, 2000);
          } else {
            // won
            setTimeout(self.solve, 100);
          };
        };
      }

    },
    mounted: function() {
      this.newGame();
      //setTimeout(this.solve, 500);
    }
  });
  window.app = app; // TODO

})();
