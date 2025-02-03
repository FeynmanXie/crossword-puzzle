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

        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                this.reset();
                const shuffledWords = [...words].sort(() => Math.random() - 0.5);

                // 放置第一个单词在中心位置
                const firstWord = shuffledWords[0];
                const row = 7;
                const col = Math.floor((15 - firstWord.text.length) / 2);
                this.placeWord(firstWord, row, col, true);

                // 尝试放置其余单词
                let placedCount = 1;
                for (let i = 1; i < shuffledWords.length; i++) {
                    const word = shuffledWords[i];
                    if (this.findAndPlaceWord(word)) {
                        placedCount++;
                    }
                }

                // 确保放置了足够的单词
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
        // 尝试所有可能的位置
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                // 尝试水平放置
                if (this.canPlaceWord(word.text, row, col, true)) {
                    this.placeWord(word, row, col, true);
                    return true;
                }
                // 尝试垂直放置
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