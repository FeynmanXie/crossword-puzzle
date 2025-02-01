// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 500; // 增加最大尝试次数
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
            sortedWords[0].text.length + 6, // 增加边距
            Math.ceil(Math.sqrt(words.reduce((sum, word) => sum + word.text.length, 0) * 2.2))
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
                    if (!this.placeNextWord(sortedWords[i])) {
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
                if (attempt === this.maxAttempts - 1) {
                    throw new Error('Could not place all words after multiple attempts');
                }
                continue;
            }
        }
    }

    placeNextWord(word) {
        // 找到所有可能的交叉点
        const intersections = [];
        
        for (const placedWord of this.placedWords) {
            const placed = placedWord.text;
            const placedHorizontal = placedWord.horizontal;
            
            for (let i = 0; i < word.text.length; i++) {
                for (let j = 0; j < placed.length; j++) {
                    if (word.text[i] === placed[j]) {
                        // 尝试两个方向的放置
                        const positions = [];
                        
                        // 如果已放置的单词是水平的，尝试垂直放置
                        if (placedHorizontal) {
                            const row = placedWord.row - i;
                            const col = placedWord.col + j;
                            if (this.canPlaceWord(word.text, row, col, false)) {
                                positions.push({
                                    row,
                                    col,
                                    horizontal: false,
                                    score: this.calculatePlacementScore(word.text, row, col, false)
                                });
                            }
                        }
                        
                        // 如果已放置的单词是垂直的，尝试水平放置
                        if (!placedHorizontal) {
                            const row = placedWord.row + j;
                            const col = placedWord.col - i;
                            if (this.canPlaceWord(word.text, row, col, true)) {
                                positions.push({
                                    row,
                                    col,
                                    horizontal: true,
                                    score: this.calculatePlacementScore(word.text, row, col, true)
                                });
                            }
                        }

                        // 随机打乱位置顺序，增加变化性
                        for (let k = positions.length - 1; k > 0; k--) {
                            const l = Math.floor(Math.random() * (k + 1));
                            [positions[k], positions[l]] = [positions[l], positions[k]];
                        }

                        intersections.push(...positions);
                    }
                }
            }
        }

        // 如果找到可行的交叉点，选择得分最高的
        if (intersections.length > 0) {
            // 按得分排序，选择最佳位置
            intersections.sort((a, b) => b.score - a.score);
            
            // 从前3个最佳位置中随机选择一个
            const numChoices = Math.min(3, intersections.length);
            const choiceIndex = Math.floor(Math.random() * numChoices);
            const best = intersections[choiceIndex];
            
            this.placeWord(word, best.row, best.col, best.horizontal);
            return true;
        }

        return false;
    }

    calculatePlacementScore(word, row, col, horizontal) {
        let score = 0;
        let intersectionCount = 0;

        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;

            // 检查交叉点
            if (this.grid[currentRow][currentCol] === word[i]) {
                intersectionCount++;
                score += 10; // 交叉点得分
            }

            // 检查相邻位置
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    
                    const r = currentRow + dr;
                    const c = currentCol + dc;
                    
                    if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
                        if (this.grid[r][c] !== null) {
                            if ((horizontal && dr === 0) || (!horizontal && dc === 0)) {
                                score -= 3; // 减少平行相邻扣分
                            } else {
                                score += 1; // 减少垂直相邻加分
                            }
                        }
                    }
                }
            }
        }

        // 如果没有交叉点，返回较低的分数而不是极低分
        if (intersectionCount === 0) {
            return -100;
        }

        // 根据单词位置调整分数，减少中心位置的影响
        const centerRow = this.size / 2;
        const centerCol = this.size / 2;
        const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        score -= distanceFromCenter * 0.5; // 减少距离中心的权重

        return score;
    }

    canPlaceWord(word, row, col, horizontal) {
        // 检查是否超出边界
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

            // 检查相邻位置，允许更多的相邻情况
            if (horizontal) {
                // 检查上下位置是否有字母
                if (currentRow > 0 && this.grid[currentRow - 1][currentCol] !== null &&
                    !this.isPartOfCrossword(currentRow - 1, currentCol)) return false;
                if (currentRow < this.size - 1 && this.grid[currentRow + 1][currentCol] !== null &&
                    !this.isPartOfCrossword(currentRow + 1, currentCol)) return false;
            } else {
                // 检查左右位置是否有字母
                if (currentCol > 0 && this.grid[currentRow][currentCol - 1] !== null &&
                    !this.isPartOfCrossword(currentRow, currentCol - 1)) return false;
                if (currentCol < this.size - 1 && this.grid[currentRow][currentCol + 1] !== null &&
                    !this.isPartOfCrossword(currentRow, currentCol + 1)) return false;
            }
        }

        // 检查单词的前后是否有其他字母，允许更多的情况
        if (horizontal) {
            if (col > 0 && this.grid[row][col - 1] !== null &&
                !this.isPartOfCrossword(row, col - 1)) return false;
            if (col + word.length < this.size && this.grid[row][col + word.length] !== null &&
                !this.isPartOfCrossword(row, col + word.length)) return false;
        } else {
            if (row > 0 && this.grid[row - 1][col] !== null &&
                !this.isPartOfCrossword(row - 1, col)) return false;
            if (row + word.length < this.size && this.grid[row + word.length][col] !== null &&
                !this.isPartOfCrossword(row + word.length, col)) return false;
        }

        // 必须有交叉点（除了第一个单词）
        return this.placedWords.length === 0 || hasIntersection;
    }

    isPartOfCrossword(row, col) {
        // 检查一个位置是否是已放置单词的一部分
        return this.placedWords.some(word => {
            if (word.horizontal) {
                return row === word.row && 
                       col >= word.col && 
                       col < word.col + word.text.length;
            } else {
                return col === word.col && 
                       row >= word.row && 
                       row < word.row + word.text.length;
            }
        });
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