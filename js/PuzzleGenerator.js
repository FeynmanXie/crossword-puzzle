// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 100;
        this.debug = true; // 启用调试
    }

    reset() {
        this.grid = [];
        this.size = 0;
        this.placedWords = [];
        this.wordNumber = 1;
    }

    log(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }

    generatePuzzle(words) {
        if (!Array.isArray(words) || words.length < 2) {
            throw new Error('At least 2 words are required');
        }

        this.log('Starting puzzle generation with words:', words.map(w => w.text));

        const maxLength = Math.max(...words.map(w => w.text.length));
        this.size = maxLength * 2 + 2;
        this.log('Grid size set to:', this.size);

        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                this.log(`\nAttempt ${attempt + 1}/${this.maxAttempts}`);
                this.reset();
                this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));

                const shuffledWords = [...words].sort(() => Math.random() - 0.5);
                this.log('Shuffled words:', shuffledWords.map(w => w.text));
                
                // 放置第一个单词
                const firstWord = shuffledWords[0];
                const centerRow = Math.floor(this.size / 2);
                const centerCol = Math.floor((this.size - firstWord.text.length) / 2);
                this.log(`Placing first word "${firstWord.text}" at [${centerRow}, ${centerCol}] horizontally`);
                this.placeWord(firstWord, centerRow, centerCol, true);
                this.logGrid();

                // 尝试放置其余单词
                for (let i = 1; i < shuffledWords.length; i++) {
                    const word = shuffledWords[i];
                    this.log(`\nTrying to place word "${word.text}"`);
                    if (!this.tryPlaceWord(word)) {
                        this.log(`Failed to place word "${word.text}"`);
                        continue;
                    }
                    this.log(`Successfully placed word "${word.text}"`);
                    this.logGrid();
                }

                if (this.placedWords.length >= 4) {
                    this.log(`Success! Placed ${this.placedWords.length} words`);
                    this.trimGrid();
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
                this.log(`Not enough words placed: ${this.placedWords.length}/4 minimum`);
            } catch (error) {
                this.log('Error during placement:', error);
                continue;
            }
        }
        
        this.log('Failed to generate puzzle after all attempts');
        throw new Error('Could not generate a valid puzzle');
    }

    tryPlaceWord(word) {
        for (const placedWord of this.placedWords) {
            this.log(`Checking against placed word "${placedWord.text}"`);
            
            for (let i = 0; i < word.text.length; i++) {
                for (let j = 0; j < placedWord.text.length; j++) {
                    if (word.text[i] === placedWord.text[j]) {
                        this.log(`Found matching letter "${word.text[i]}" at positions ${i} and ${j}`);
                        
                        // 尝试垂直放置
                        if (placedWord.horizontal) {
                            const row = placedWord.row - i;
                            const col = placedWord.col + j;
                            this.log(`Trying vertical placement at [${row}, ${col}]`);
                            if (this.canPlaceWord(word.text, row, col, false)) {
                                this.placeWord(word, row, col, false);
                                return true;
                            }
                            this.log('Vertical placement failed');
                        }
                        
                        // 尝试水平放置
                        else {
                            const row = placedWord.row + j;
                            const col = placedWord.col - i;
                            this.log(`Trying horizontal placement at [${row}, ${col}]`);
                            if (this.canPlaceWord(word.text, row, col, true)) {
                                this.placeWord(word, row, col, true);
                                return true;
                            }
                            this.log('Horizontal placement failed');
                        }
                    }
                }
            }
        }
        return false;
    }

    canPlaceWord(word, row, col, horizontal) {
        // 检查边界
        if (row < 0 || col < 0 || 
            (horizontal && col + word.length > this.size) ||
            (!horizontal && row + word.length > this.size)) {
            this.log('Failed: Out of bounds');
            return false;
        }

        let hasIntersection = false;

        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            const current = this.grid[currentRow][currentCol];

            if (current !== null) {
                if (current !== word[i]) {
                    this.log(`Failed: Letter mismatch at [${currentRow}, ${currentCol}]`);
                    return false;
                }
                hasIntersection = true;
            }

            // 检查相邻位置
            if (horizontal) {
                if (currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null) {
                    this.log(`Failed: Adjacent letter above at [${currentRow}, ${currentCol}]`);
                    return false;
                }
                if (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null) {
                    this.log(`Failed: Adjacent letter below at [${currentRow}, ${currentCol}]`);
                    return false;
                }
            } else {
                if (currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null) {
                    this.log(`Failed: Adjacent letter left at [${currentRow}, ${currentCol}]`);
                    return false;
                }
                if (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null) {
                    this.log(`Failed: Adjacent letter right at [${currentRow}, ${currentCol}]`);
                    return false;
                }
            }
        }

        if (horizontal) {
            if (col > 0 && this.grid[row][col - 1] !== null) {
                this.log('Failed: Letter before word');
                return false;
            }
            if (col + word.length < this.size && this.grid[row][col + word.length] !== null) {
                this.log('Failed: Letter after word');
                return false;
            }
        } else {
            if (row > 0 && this.grid[row - 1][col] !== null) {
                this.log('Failed: Letter above word');
                return false;
            }
            if (row + word.length < this.size && this.grid[row + word.length][col] !== null) {
                this.log('Failed: Letter below word');
                return false;
            }
        }

        return this.placedWords.length === 0 || hasIntersection;
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

    placeWord(word, row, col, horizontal) {
        for (let i = 0; i < word.text.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            this.grid[currentRow][currentCol] = word.text[i];
        }

        this.placedWords.push({
            text: word.text,
            hint: word.hint,
            row: row,
            col: col,
            horizontal: horizontal,
            number: this.wordNumber++
        });
    }

    trimGrid() {
        let minRow = this.size, maxRow = 0;
        let minCol = this.size, maxCol = 0;

        // 找到有内容的边界
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] !== null) {
                    minRow = Math.min(minRow, i);
                    maxRow = Math.max(maxRow, i);
                    minCol = Math.min(minCol, j);
                    maxCol = Math.max(maxCol, j);
                }
            }
        }

        // 添加1格边距
        minRow = Math.max(0, minRow - 1);
        maxRow = Math.min(this.size - 1, maxRow + 1);
        minCol = Math.max(0, minCol - 1);
        maxCol = Math.min(this.size - 1, maxCol + 1);

        // 创建新网格
        const newGrid = [];
        for (let i = minRow; i <= maxRow; i++) {
            const row = [];
            for (let j = minCol; j <= maxCol; j++) {
                row.push(this.grid[i][j]);
            }
            newGrid.push(row);
        }

        // 更新单词位置
        this.placedWords.forEach(word => {
            word.row -= minRow;
            word.col -= minCol;
        });

        this.grid = newGrid;
        this.size = newGrid.length;
    }
} 