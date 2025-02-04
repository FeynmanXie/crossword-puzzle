export class Grid {
    constructor(size = 15) {
        this.size = size;
        this.grid = Array(size).fill(null).map(() => Array(size).fill(null));
        this.placedWords = [];
    }

    // 克隆网格
    clone() {
        const newGrid = new Grid(this.size);
        newGrid.grid = this.grid.map(row => [...row]);
        newGrid.placedWords = this.placedWords.map(word => ({...word}));
        return newGrid;
    }

    // 检查是否可以水平放置单词
    canPlaceWordHorizontally(word, row, startCol) {
        if (startCol < 0 || startCol + word.text.length > this.size || row < 0 || row >= this.size) {
            return false;
        }

        let hasIntersection = false;
        let adjacentWords = false;

        for (let i = 0; i < word.text.length; i++) {
            const col = startCol + i;

            if (this.grid[row][col] !== null) {
                if (this.grid[row][col] !== word.text[i]) {
                    return false;
                }
                hasIntersection = true;
            } else {
                if (row > 0 && this.grid[row-1][col] !== null) adjacentWords = true;
                if (row < this.size-1 && this.grid[row+1][col] !== null) adjacentWords = true;
            }

            if (i === 0 && startCol > 0 && this.grid[row][startCol-1] !== null) return false;
            if (i === word.text.length-1 && col < this.size-1 && this.grid[row][col+1] !== null) return false;
        }

        return hasIntersection || (word.text.length <= 3 && adjacentWords);
    }

    // 检查是否可以垂直放置单词
    canPlaceWordVertically(word, startRow, col) {
        if (startRow < 0 || startRow + word.text.length > this.size || col < 0 || col >= this.size) {
            return false;
        }

        let hasIntersection = false;
        let adjacentWords = false;

        for (let i = 0; i < word.text.length; i++) {
            const row = startRow + i;

            if (this.grid[row][col] !== null) {
                if (this.grid[row][col] !== word.text[i]) {
                    return false;
                }
                hasIntersection = true;
            } else {
                if (col > 0 && this.grid[row][col-1] !== null) adjacentWords = true;
                if (col < this.size-1 && this.grid[row][col+1] !== null) adjacentWords = true;
            }

            if (i === 0 && startRow > 0 && this.grid[startRow-1][col] !== null) return false;
            if (i === word.text.length-1 && row < this.size-1 && this.grid[row+1][col] !== null) return false;
        }

        return hasIntersection || (word.text.length <= 3 && adjacentWords);
    }

    // 放置单词
    placeWord(word, row, col, horizontal) {
        if (row < 0 || col < 0 || row >= this.size || col >= this.size) {
            throw new Error('Invalid position');
        }

        word.row = row;
        word.col = col;
        word.horizontal = horizontal;
        word.number = this.placedWords.length + 1;

        for (let i = 0; i < word.text.length; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            
            if (r >= this.size || c >= this.size) {
                throw new Error('Word placement out of bounds');
            }
            
            this.grid[r][c] = word.text[i];
        }

        this.placedWords.push(word);
        return true;
    }

    // 寻找所有可能的交叉点
    findAllIntersections(word) {
        const intersections = [];
        const cache = new Set(); // 用于去重

        for (let letterIndex = 0; letterIndex < word.text.length; letterIndex++) {
            const letter = word.text[letterIndex];

            for (const placedWord of this.placedWords) {
                for (let k = 0; k < placedWord.text.length; k++) {
                    if (placedWord.text[k] === letter) {
                        if (placedWord.horizontal) {
                            const key = `${placedWord.row},${placedWord.col + k},v`;
                            if (!cache.has(key)) {
                                cache.add(key);
                                intersections.push({
                                    row: placedWord.row,
                                    col: placedWord.col + k,
                                    startRow: placedWord.row - letterIndex,
                                    horizontal: false,
                                    score: this.calculateIntersectionScore(word, letterIndex, placedWord, k)
                                });
                            }
                        } else {
                            const key = `${placedWord.row + k},${placedWord.col},h`;
                            if (!cache.has(key)) {
                                cache.add(key);
                                intersections.push({
                                    row: placedWord.row + k,
                                    col: placedWord.col,
                                    startCol: placedWord.col - letterIndex,
                                    horizontal: true,
                                    score: this.calculateIntersectionScore(word, letterIndex, placedWord, k)
                                });
                            }
                        }
                    }
                }
            }
        }

        return intersections;
    }

    // 计算交叉点分数
    calculateIntersectionScore(word, letterIndex, placedWord, placedLetterIndex) {
        let score = 0;

        // 增加中间交叉的权重
        const wordMiddle = word.text.length / 2;
        const placedMiddle = placedWord.text.length / 2;
        const distanceFromMiddle = (Math.abs(letterIndex - wordMiddle) / word.text.length + 
                                  Math.abs(placedLetterIndex - placedMiddle) / placedWord.text.length) / 2;
        score += 40 * (1 - distanceFromMiddle);

        // 降低末尾交叉的惩罚
        if (letterIndex === 0 || letterIndex === word.text.length - 1) score -= 10;
        if (placedLetterIndex === 0 || placedLetterIndex === placedWord.text.length - 1) score -= 10;

        // 增加方向平衡的权重
        const horizontalCount = this.placedWords.filter(w => w.horizontal).length;
        const verticalCount = this.placedWords.length - horizontalCount;
        if (placedWord.horizontal && horizontalCount > verticalCount) {
            score += 15;
        } else if (!placedWord.horizontal && verticalCount > horizontalCount) {
            score += 15;
        }

        // 增加紧凑布局的权重
        const centerRow = Math.floor(this.size / 2);
        const centerCol = Math.floor(this.size / 2);
        const distanceFromCenter = Math.abs(placedWord.row - centerRow) + Math.abs(placedWord.col - centerCol);
        score += 30 * (1 - distanceFromCenter / this.size);

        // 增加潜在交叉点的权重
        const remainingLetters = word.text.length - letterIndex - 1;
        score += remainingLetters * 5;

        return score;
    }

    // 修剪网格大小
    trim() {
        let minRow = this.size;
        let maxRow = 0;
        let minCol = this.size;
        let maxCol = 0;

        // 计算边界
        this.placedWords.forEach(word => {
            if (word.horizontal) {
                minRow = Math.min(minRow, word.row);
                maxRow = Math.max(maxRow, word.row);
                minCol = Math.min(minCol, word.col);
                maxCol = Math.max(maxCol, word.col + word.text.length - 1);
            } else {
                minRow = Math.min(minRow, word.row);
                maxRow = Math.max(maxRow, word.row + word.text.length - 1);
                minCol = Math.min(minCol, word.col);
                maxCol = Math.max(maxCol, word.col);
            }
        });

        // 增加边距
        const padding = 3; // 增加边距
        minRow = Math.max(0, minRow - padding);
        maxRow = Math.min(this.size - 1, maxRow + padding);
        minCol = Math.max(0, minCol - padding);
        maxCol = Math.min(this.size - 1, maxCol + padding);

        // 确保不会裁剪到任何已放置的单词
        this.placedWords.forEach(word => {
            if (word.horizontal) {
                maxCol = Math.max(maxCol, word.col + word.text.length - 1);
            } else {
                maxRow = Math.max(maxRow, word.row + word.text.length - 1);
            }
        });

        const newGrid = [];
        for (let i = minRow; i <= maxRow; i++) {
            const row = [];
            for (let j = minCol; j <= maxCol; j++) {
                row.push(this.grid[i][j]);
            }
            newGrid.push(row);
        }

        // 更新所有已放置单词的位置
        this.placedWords.forEach(word => {
            word.row -= minRow;
            word.col -= minCol;
        });

        this.grid = newGrid;
        this.size = newGrid.length;
    }

    // 计算布局分数
    calculateScore() {
        let score = 0;

        // 已放置单词数量
        score += this.placedWords.length * 100;

        // 布局紧凑度
        const filledCells = this.placedWords.reduce((sum, word) => sum + word.text.length, 0);
        const totalCells = this.size * this.size;
        score += (filledCells / totalCells) * 50;

        // 方向平衡
        const horizontalCount = this.placedWords.filter(w => w.horizontal).length;
        const verticalCount = this.placedWords.length - horizontalCount;
        score -= Math.abs(horizontalCount - verticalCount) * 10;

        return score;
    }
} 