// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 100; // 最大尝试次数
        this.minSpacing = 1; // 单词之间的最小间距
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

        // 计算初始网格大小 - 使用更大的空间系数
        this.size = Math.max(
            sortedWords[0].text.length + 6, // 增加边距
            Math.ceil(Math.sqrt(words.reduce((sum, word) => sum + word.text.length, 0) * 2.5)) // 增加空间系数
        );

        // 多次尝试生成拼图
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                // 创建空网格
                this.grid = Array(this.size).fill(null)
                    .map(() => Array(this.size).fill(null));
                this.placedWords = [];
                this.wordNumber = 1;

                // 放置第一个单词在中心位置
                const firstWord = sortedWords[0];
                const startRow = Math.floor(this.size / 2);
                const startCol = Math.floor((this.size - firstWord.text.length) / 2);
                
                // 随机决定第一个单词的方向
                const firstWordHorizontal = Math.random() < 0.5;
                this.placeWord(firstWord, startRow, startCol, firstWordHorizontal);

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
        
        // 首先尝试交叉放置
        for (const placedWord of shuffledPlacedWords) {
            const positions = this.findIntersectionPositions(word.text, placedWord);
            
            // 随机打乱交叉点的顺序
            this.shuffleArray(positions);
            
            for (const pos of positions) {
                // 计算可能的放置位置
                const placements = [];
                
                if (placedWord.horizontal) {
                    // 尝试垂直放置
                    const row = placedWord.row - pos.wordIndex;
                    const col = placedWord.col + pos.placedIndex;
                    if (this.canPlaceWord(word.text, row, col, false)) {
                        placements.push({ row, col, horizontal: false });
                    }
                } else {
                    // 尝试水平放置
                    const row = placedWord.row + pos.placedIndex;
                    const col = placedWord.col - pos.wordIndex;
                    if (this.canPlaceWord(word.text, row, col, true)) {
                        placements.push({ row, col, horizontal: true });
                    }
                }

                // 如果找到可行的放置位置，随机选择一个
                if (placements.length > 0) {
                    const placement = placements[Math.floor(Math.random() * placements.length)];
                    this.placeWord(word, placement.row, placement.col, placement.horizontal);
                    return true;
                }
            }
        }

        // 如果没有找到交叉点，尝试平行放置
        return this.tryPlaceWordParallel(word);
    }

    tryPlaceWordParallel(word) {
        // 在已放置单词附近尝试平行放置
        for (const placedWord of this.placedWords) {
            const horizontal = !placedWord.horizontal; // 尝试垂直于已放置单词的方向
            
            // 计算可能的起始位置范围
            const minRow = Math.max(1, placedWord.row - word.text.length - this.minSpacing);
            const maxRow = Math.min(this.size - word.text.length - 1, placedWord.row + word.text.length + this.minSpacing);
            const minCol = Math.max(1, placedWord.col - word.text.length - this.minSpacing);
            const maxCol = Math.min(this.size - word.text.length - 1, placedWord.col + word.text.length + this.minSpacing);

            // 随机尝试不同的起始位置
            const positions = [];
            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) {
                    if (this.canPlaceWord(word.text, row, col, horizontal)) {
                        positions.push({ row, col });
                    }
                }
            }

            if (positions.length > 0) {
                const pos = positions[Math.floor(Math.random() * positions.length)];
                this.placeWord(word, pos.row, pos.col, horizontal);
                return true;
            }
        }

        // 如果还是找不到位置，尝试在空白处放置
        return this.tryPlaceWordInEmptySpace(word);
    }

    tryPlaceWordInEmptySpace(word) {
        const positions = [];
        
        // 在网格的中心区域寻找可能的位置
        const centerStart = Math.floor(this.size * 0.25);
        const centerEnd = Math.floor(this.size * 0.75);
        
        for (let row = centerStart; row <= centerEnd; row++) {
            for (let col = centerStart; col <= centerEnd; col++) {
                if (this.canPlaceWord(word.text, row, col, true)) {
                    positions.push({ row, col, horizontal: true });
                }
                if (this.canPlaceWord(word.text, row, col, false)) {
                    positions.push({ row, col, horizontal: false });
                }
            }
        }

        if (positions.length > 0) {
            const pos = positions[Math.floor(Math.random() * positions.length)];
            this.placeWord(word, pos.row, pos.col, pos.horizontal);
            return true;
        }

        return false;
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
        return positions;
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
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r = currentRow + dr;
                    const c = currentCol + dc;
                    if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
                        if (this.grid[r][c] !== null) {
                            // 允许在交叉点处相邻
                            if ((horizontal && dr === 0) || (!horizontal && dc === 0)) {
                                continue;
                            }
                            hasAdjacentWord = true;
                        }
                    }
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

        // 添加2格边距
        minRow = Math.max(0, minRow - 2);
        maxRow = Math.min(this.size - 1, maxRow + 2);
        minCol = Math.max(0, minCol - 2);
        maxCol = Math.min(this.size - 1, maxCol + 2);

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