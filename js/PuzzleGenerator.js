// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 100; // 最大尝试次数
    }

    reset() {
        this.grid = [];
        this.size = 0;
        this.placedWords = [];
        this.wordNumber = 1;
    }

    generatePuzzle(words) {
        // 验证输入
        if (!Array.isArray(words) || words.length < 2) {
            throw new Error('At least 2 words are required');
        }

        // 重置状态
        this.reset();

        // 按长度排序单词，长的先放
        const sortedWords = [...words].sort((a, b) => b.text.length - a.text.length);

        // 计算初始网格大小
        this.size = Math.max(
            sortedWords[0].text.length + 4, // 增加边距
            Math.ceil(Math.sqrt(words.reduce((sum, word) => sum + word.text.length, 0) * 2.0)) // 增加空间系数
        );

        // 多次尝试生成拼图
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                // 创建空网格
                this.grid = Array(this.size).fill(null)
                    .map(() => Array(this.size).fill(null));
                this.placedWords = [];
                this.wordNumber = 1;

                // 随机选择起始位置
                const firstWord = sortedWords[0];
                const startRow = Math.floor(this.size / 2) + Math.floor(Math.random() * 3) - 1;
                const startCol = Math.floor((this.size - firstWord.text.length) / 2) + Math.floor(Math.random() * 3) - 1;
                
                this.placeWord(firstWord, startRow, startCol, true);

                // 尝试放置其余单词
                for (let i = 1; i < sortedWords.length; i++) {
                    const word = sortedWords[i];
                    if (!this.tryPlaceWord(word)) {
                        throw new Error('Word placement failed');
                    }
                }

                // 如果所有单词都放置成功，裁剪网格并返回结果
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
            } catch (error) {
                // 如果是最后一次尝试，抛出错误
                if (attempt === this.maxAttempts - 1) {
                    throw new Error('Could not place all words after multiple attempts');
                }
                // 否则继续尝试
                continue;
            }
        }
    }

    tryPlaceWord(word) {
        // 遍历已放置的单词，寻找交叉点
        const shuffledPlacedWords = this.shuffleArray([...this.placedWords]);
        
        for (const placedWord of shuffledPlacedWords) {
            // 尝试不同的起始位置
            const positions = this.findIntersectionPositions(word.text, placedWord);
            
            for (const pos of positions) {
                if (placedWord.horizontal) {
                    // 垂直放置新单词
                    const row = placedWord.row - pos.wordIndex;
                    const col = placedWord.col + pos.placedIndex;
                    if (this.canPlaceWord(word.text, row, col, false)) {
                        this.placeWord(word, row, col, false);
                        return true;
                    }
                } else {
                    // 水平放置新单词
                    const row = placedWord.row + pos.placedIndex;
                    const col = placedWord.col - pos.wordIndex;
                    if (this.canPlaceWord(word.text, row, col, true)) {
                        this.placeWord(word, row, col, true);
                        return true;
                    }
                }
            }
        }

        // 如果没有找到交叉点，尝试在空白处放置
        return this.tryPlaceWordInEmptySpace(word);
    }

    findIntersectionPositions(word, placedWord) {
        const positions = [];
        for (let i = 0; i < word.length; i++) {
            for (let j = 0; j < placedWord.text.length; j++) {
                if (word[i] === placedWord.text[j]) {
                    positions.push({ wordIndex: i, placedIndex: j });
                }
            }
        }
        return this.shuffleArray(positions);
    }

    tryPlaceWordInEmptySpace(word) {
        // 在网格的空白区域尝试放置单词
        for (let row = 1; row < this.size - word.text.length; row++) {
            for (let col = 1; col < this.size - word.text.length; col++) {
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
        // 检查是否超出边界
        if (row < 0 || col < 0 || 
            (horizontal && col + word.length > this.size) ||
            (!horizontal && row + word.length > this.size)) {
            return false;
        }

        let hasIntersection = false;
        let hasAdjacentWord = false;

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

            // 检查相邻位置是否有其他单词
            if (horizontal) {
                // 检查上下位置
                if (currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null) {
                    hasAdjacentWord = true;
                }
                if (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null) {
                    hasAdjacentWord = true;
                }
            } else {
                // 检查左右位置
                if (currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null) {
                    hasAdjacentWord = true;
                }
                if (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null) {
                    hasAdjacentWord = true;
                }
            }
        }

        // 检查单词的前后是否有其他字母
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

        // 必须至少有一个交叉点或者是第一个单词
        return this.placedWords.length === 0 || hasIntersection || !hasAdjacentWord;
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

    trimGrid() {
        // 找到有内容的边界
        let minRow = this.size, maxRow = 0;
        let minCol = this.size, maxCol = 0;

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
        const newSize = Math.max(maxRow - minRow + 1, maxCol - minCol + 1);
        const newGrid = Array(newSize).fill(null)
            .map(() => Array(newSize).fill(null));

        // 复制内容到新网格
        for (let i = 0; i < newSize; i++) {
            for (let j = 0; j < newSize; j++) {
                if (i + minRow < this.size && j + minCol < this.size) {
                    newGrid[i][j] = this.grid[i + minRow][j + minCol];
                }
            }
        }

        // 更新单词位置
        this.placedWords.forEach(word => {
            word.row -= minRow;
            word.col -= minCol;
        });

        // 更新网格
        this.grid = newGrid;
        this.size = newSize;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
} 