// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
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
            sortedWords[0].text.length + 2,
            Math.ceil(Math.sqrt(words.reduce((sum, word) => sum + word.text.length, 0) * 1.5))
        );

        // 创建空网格
        this.grid = Array(this.size).fill(null)
            .map(() => Array(this.size).fill(null));

        // 放置第一个单词在中间
        const firstWord = sortedWords[0];
        const startRow = Math.floor(this.size / 2);
        const startCol = Math.floor((this.size - firstWord.text.length) / 2);
        
        this.placeWord(firstWord, startRow, startCol, true);

        // 尝试放置其余单词
        for (let i = 1; i < sortedWords.length; i++) {
            const word = sortedWords[i];
            let placed = false;

            // 遍历已放置的单词，寻找交叉点
            for (const placedWord of this.placedWords) {
                for (let j = 0; j < word.text.length; j++) {
                    for (let k = 0; k < placedWord.text.length; k++) {
                        if (word.text[j] === placedWord.text[k]) {
                            // 尝试在交叉点放置
                            if (placedWord.horizontal) {
                                // 垂直放置新单词
                                const row = placedWord.row - j;
                                const col = placedWord.col + k;
                                if (this.canPlaceWord(word.text, row, col, false)) {
                                    this.placeWord(word, row, col, false);
                                    placed = true;
                                    break;
                                }
                            } else {
                                // 水平放置新单词
                                const row = placedWord.row + k;
                                const col = placedWord.col - j;
                                if (this.canPlaceWord(word.text, row, col, true)) {
                                    this.placeWord(word, row, col, true);
                                    placed = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (placed) break;
                }
                if (placed) break;
            }

            if (!placed) {
                throw new Error('Could not place all words');
            }
        }

        // 裁剪网格，移除空白边缘
        this.trimGrid();

        // 返回游戏数据
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

    canPlaceWord(word, row, col, horizontal) {
        // 检查是否超出边界
        if (row < 0 || col < 0 || 
            (horizontal && col + word.length > this.size) ||
            (!horizontal && row + word.length > this.size)) {
            return false;
        }

        // 检查每个字母位置
        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;
            const current = this.grid[currentRow][currentCol];

            // 如果位置已有字母，必须匹配
            if (current !== null && current !== word[i]) {
                return false;
            }

            // 检查相邻位置
            if (horizontal) {
                // 检查上下位置
                if ((currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null && i === 0) ||
                    (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null && i === 0)) {
                    return false;
                }
            } else {
                // 检查左右位置
                if ((currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null && i === 0) ||
                    (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null && i === 0)) {
                    return false;
                }
            }
        }

        return true;
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
} 