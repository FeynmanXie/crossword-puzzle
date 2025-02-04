// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 100;
        this.debug = false; // 关闭调试
        this.MIN_WORDS = 4;  // 最少单词数
        this.MAX_WORDS = 8;  // 最多单词数
    }

    reset() {
        this.grid = [];
        this.size = 15; // 固定大小为15x15
        this.placedWords = [];
        this.wordNumber = 1;
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
    }

    log(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }

    generatePuzzle(words) {
        if (!Array.isArray(words) || words.length < this.MIN_WORDS || words.length > this.MAX_WORDS) {
            throw new Error(`Words count must be between ${this.MIN_WORDS} and ${this.MAX_WORDS}`);
        }

        // 按长度排序单词，优先放置较长的单词
        const sortedWords = [...words].sort((a, b) => b.text.length - a.text.length);

        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                this.reset();
                
                // 放置第一个（最长的）单词在中心位置
                const firstWord = sortedWords[0];
                const row = 7;
                const col = Math.floor((15 - firstWord.text.length) / 2);
                this.placeWord(firstWord, row, col, true);

                // 尝试放置其余单词
                let placedCount = 1;
                for (let i = 1; i < sortedWords.length && placedCount < this.MAX_WORDS; i++) {
                    if (this.findAndPlaceWord(sortedWords[i])) {
                        placedCount++;
                    }
                }

                // 如果放置了足够的单词，返回结果
                if (placedCount >= this.MIN_WORDS) {
                    return {
                        grid: {
                            grid: this.grid,
                            size: this.size,
                            placedWords: this.placedWords
                        },
                        words: this.placedWords.map(word => ({
                            text: word.text,
                            hint: word.hint,
                            number: word.number,
                            horizontal: word.horizontal
                        }))
                    };
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not generate a valid puzzle');
    }

    findAndPlaceWord(word) {
        // 优先尝试与已放置单词相交的位置
        for (const placedWord of this.placedWords) {
            for (let i = 0; i < word.text.length; i++) {
                for (let j = 0; j < placedWord.text.length; j++) {
                    if (word.text[i] === placedWord.text[j]) {
                        // 尝试垂直放置（如果已放置的是水平的）
                        if (placedWord.horizontal) {
                            const row = placedWord.row - i;
                            const col = placedWord.col + j;
                            if (this.canPlaceWord(word.text, row, col, false)) {
                                this.placeWord(word, row, col, false);
                                return true;
                            }
                        }
                        // 尝试水平放置（如果已放置的是垂直的）
                        else {
                            const row = placedWord.row + j;
                            const col = placedWord.col - i;
                            if (this.canPlaceWord(word.text, row, col, true)) {
                                this.placeWord(word, row, col, true);
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // 如果无法与已有单词相交，尝试其他位置
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.canPlaceWord(word.text, row, col, true)) {
                    this.placeWord(word, row, col, true);
                    return true;
                }
                if (this.canPlaceWord(word.text, row, col, false)) {
                    this.placeWord(word, row, col, false);
                    return true;
                }
            }
        }
        return false;
    }

    canPlaceWord(word, row, col, horizontal) {
        // 检查边界
        if (horizontal) {
            if (col + word.length > this.size) return false;
        } else {
            if (row + word.length > this.size) return false;
        }

        let hasIntersection = false;

        // 检查每个字母位置
        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            const current = this.grid[currentRow][currentCol];

            // 检查字母匹配
            if (current !== null) {
                if (current !== word[i]) return false;
                hasIntersection = true;
                continue;
            }

            // 检查相邻位置
            if (horizontal) {
                // 检查上下相邻
                if ((currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null) ||
                    (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null)) {
                    return false;
                }
            } else {
                // 检查左右相邻
                if ((currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null) ||
                    (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null)) {
                    return false;
                }
            }
        }

        // 检查单词的前后
        if (horizontal) {
            if ((col > 0 && this.grid[row][col - 1] !== null) ||
                (col + word.length < this.size && this.grid[row][col + word.length] !== null)) {
                return false;
            }
        } else {
            if ((row > 0 && this.grid[row - 1][col] !== null) ||
                (row + word.length < this.size && this.grid[row + word.length][col] !== null)) {
                return false;
            }
        }

        return this.placedWords.length === 0 || hasIntersection;
    }

    placeWord(word, row, col, horizontal) {
        // 放置单词
        for (let i = 0; i < word.text.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            this.grid[currentRow][currentCol] = word.text[i];
        }

        // 记录单词信息
        this.placedWords.push({
            text: word.text,
            hint: word.hint,
            row: row,
            col: col,
            horizontal: horizontal,
            number: this.wordNumber++
        });
    }

    logGrid() {
        if (!this.debug) return;
        
        console.log('\nCurrent grid state:');
        for (let i = 0; i < this.size; i++) {
            let row = '';
            for (let j = 0; j < this.size; j++) {
                row += (this.grid[i][j] === null ? '.' : this.grid[i][j]) + ' ';
            }
            console.log(row);
        }
        console.log('\n');
    }
} 