// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 100;
    }

    reset() {
        this.grid = [];
        this.size = 0;
        this.placedWords = [];
        this.wordNumber = 1;
    }

    generatePuzzle(words) {
        if (!Array.isArray(words) || words.length < 2) {
            throw new Error('At least 2 words are required');
        }

        // 找到最长的单词
        const maxLength = Math.max(...words.map(w => w.text.length));
        this.size = maxLength * 2 + 2;

        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                this.reset();
                this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));

                // 随机打乱单词顺序
                const shuffledWords = [...words].sort(() => Math.random() - 0.5);
                
                // 放置第一个单词在中心
                const firstWord = shuffledWords[0];
                const centerRow = Math.floor(this.size / 2);
                const centerCol = Math.floor((this.size - firstWord.text.length) / 2);
                this.placeWord(firstWord, centerRow, centerCol, true);

                // 尝试放置其余单词
                for (let i = 1; i < shuffledWords.length; i++) {
                    const word = shuffledWords[i];
                    if (!this.tryPlaceWord(word)) {
                        continue;
                    }
                }

                // 如果至少放置了4个单词，认为成功
                if (this.placedWords.length >= 4) {
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
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not generate a valid puzzle');
    }

    tryPlaceWord(word) {
        // 遍历已放置的单词
        for (const placedWord of this.placedWords) {
            // 遍历新单词的每个字母
            for (let i = 0; i < word.text.length; i++) {
                // 遍历已放置单词的每个字母
                for (let j = 0; j < placedWord.text.length; j++) {
                    // 如果字母匹配
                    if (word.text[i] === placedWord.text[j]) {
                        // 尝试垂直放置
                        if (placedWord.horizontal) {
                            const row = placedWord.row - i;
                            const col = placedWord.col + j;
                            if (this.canPlaceWord(word.text, row, col, false)) {
                                this.placeWord(word, row, col, false);
                                return true;
                            }
                        }
                        // 尝试水平放置
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
        return false;
    }

    canPlaceWord(word, row, col, horizontal) {
        // 检查边界
        if (row < 0 || col < 0 || 
            (horizontal && col + word.length > this.size) ||
            (!horizontal && row + word.length > this.size)) {
            return false;
        }

        let hasIntersection = false;

        // 检查每个字母位置
        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            const current = this.grid[currentRow][currentCol];

            // 如果位置已有字母，必须匹配
            if (current !== null) {
                if (current !== word[i]) {
                    return false;
                }
                hasIntersection = true;
                continue;
            }

            // 检查相邻位置
            if (horizontal) {
                // 检查上下位置
                if (currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null) return false;
                if (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null) return false;
            } else {
                // 检查左右位置
                if (currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null) return false;
                if (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null) return false;
            }
        }

        // 检查单词的前后是否有其他字母
        if (horizontal) {
            if (col > 0 && this.grid[row][col - 1] !== null) return false;
            if (col + word.length < this.size && this.grid[row][col + word.length] !== null) return false;
        } else {
            if (row > 0 && this.grid[row - 1][col] !== null) return false;
            if (row + word.length < this.size && this.grid[row + word.length][col] !== null) return false;
        }

        return this.placedWords.length === 0 || hasIntersection;
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