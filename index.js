(function() {
  Vue.use(VueMaterial.default);
})();

(function() {
  document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
  });
})();

(function() {
  var app;

  Vue.component("cell", {
    template: "#cellTemplate",

    props: {
      "row": {default: 0},
      "column": {default: 0},
      "revealed": {default: false},
      "incorrect": {default: false},
      "isMine": {default: false},
      "surroundingCells": {default: function() { return []; }},
      "surroundingMines": {default: function() { return []; }},
      "flaggedAsMine": {default: false},
      "flaggedAsPossibleMine": {default: false}
    },

    methods: {
      getSurroundingCellsFlaggedAsMine: function() {
        return this.surroundingCells.filter(function(cell) {
          return cell.flaggedAsMine;
        });
      },

      getSurroundingCellsUnrevealedAndUnflagged: function() {
        return this.surroundingCells.filter(function(cell) {
          return !cell.revealed && !cell.flaggedAsMine && !cell.flaggedAsPossibleMine;
        });
      }
    }
  });

  app = new Vue({
    el: "#app",
    data: {
      rows: 16,
      columns: 30,
      mines: 99,
      cells: []
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
        this.cells = [];

        for (var rowIndex = 0; rowIndex < this.rows; rowIndex++) {
          for (var columnIndex = 0; columnIndex < this.columns; columnIndex++) {
            this.cells.push({
              row: rowIndex,
              column: columnIndex,
              revealed: false,
              incorrect: false,
              isMine: false,
              surroundingCells: [],
              surroundingMines: [],
              flaggedAsMine: false,
              flaggedAsPossibleMine: false
            });
          };
        };
      },

      revealCell: function(cell) {
        var self = this;

        if (
          cell.revealed
          || cell.flaggedAsMine
          || cell.flaggedAsPossibleMine
        ) {
          return;
        };

        cell.revealed = true;

        if (cell.isMine) {
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

        if (self.cells.filter(function(otherCell) { return otherCell.isMine; }).length == 0) {
          populateSurroundingCells();
          populateMines([cell].concat(cell.surroundingCells));
          populateSurroundingMines();
        };

        if (!cell.isMine) {
          cell.surroundingCells.forEach(function(otherCell) {
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

        function populateSurroundingCells() {
          self.cells.forEach(function(cell) {
            cell.surroundingCells = [
              // top
              self.getCellByCoordinates(cell.row - 1, cell.column),

              // top-right
              self.getCellByCoordinates(cell.row - 1, cell.column + 1),

              // right
              self.getCellByCoordinates(cell.row, cell.column + 1),

              // bottom-right
              self.getCellByCoordinates(cell.row + 1, cell.column + 1),

              // bottom
              self.getCellByCoordinates(cell.row + 1, cell.column),

              // bottom-left
              self.getCellByCoordinates(cell.row + 1, cell.column - 1),

              // left
              self.getCellByCoordinates(cell.row, cell.column - 1),

              // top-left
              self.getCellByCoordinates(cell.row - 1, cell.column - 1),
            ].filter(function(otherCell) {
              return otherCell;
            });
          });
        };

        function populateSurroundingMines() {
          self.cells.forEach(function (cell) {
            cell.surroundingMines = cell.surroundingCells.filter(function(otherCell) {
              return otherCell.isMine;
            });
          });
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

          var surroundingCellsFlagged = cell.surroundingCells.filter(function(cell) {
            return !cell.revealed && cell.flaggedAsMine;
          });

          if (surroundingCellsFlagged.length == cell.surroundingMines.length) {
            cell.surroundingCells.forEach(function(cell) {
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
          && sourceCell.surroundingMines == 0
        ) {
          cell.revealed = true;
          cell.surroundingCells.forEach(function(otherCell) {
            self.cascadeReveal(otherCell, cell);
          });
        };
      },

      getCellByCoordinates: function(rowIndex, columnIndex) {
        try {
          return this.cells.filter(function(cell) {
            return cell.row == rowIndex && cell.column == columnIndex;
          })[0];
        } catch (e) { };
      },

      solveFlag: function() {
        this.cells
          .filter(function(cell) {
            return cell.revealed;
          })
          .forEach(function(cell) {
            var unrevealedSurroundingCells = cell.surroundingCells.filter(function(otherCell) {
              return !otherCell.revealed;
            });

            if (unrevealedSurroundingCells.length == cell.surroundingMines.length) {
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
            var flaggedSurroundingCells = cell.surroundingCells.filter(function(otherCell) {
              return otherCell.flaggedAsMine;
            });

            if (flaggedSurroundingCells.length == cell.surroundingMines.length) {
              cell.surroundingCells
                .filter(function(otherCell) {
                  return !otherCell.revealed && !otherCell.flaggedAsMine;
                })
                .forEach(function(otherCell) {
                  self.revealCell(otherCell);
                });
            };
          });
      },

      solveWithPossibleFlags: function() {
        var self = this;

        removeAllPossibleFlags();

        getCellsWithUnknownMines()
          .forEach(function(cell) {
            var surroundingCellsUnrevealedAndUnflagged = cell.getSurroundingCellsUnrevealedAndUnflagged();

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
              return cell.revealed && cell.surroundingMines.length > cell.getSurroundingCellsFlaggedAsMine().length;
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

  function Cell(row, column) {
    return {
      row: row,
      column: column,
      revealed: false,
      incorrect: false,
      isMine: false,
      surroundingCells: [],
      surroundingMines: [],
      flaggedAsMine: false,
      flaggedAsPossibleMine: false
    }
  };

})();
