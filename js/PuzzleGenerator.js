// 填字游戏生成器类
export class PuzzleGenerator {
    constructor() {
        this.reset();
        this.maxAttempts = 1000;
        this.minWordsRequired = 8; // 新增:最少需要放置的单词数
        this.intersectionMatrix = {};
    }

    reset() {
        this.grid = [];
        this.size = 0;
        this.placedWords = [];
        this.wordNumber = 1;
        this.intersectionMatrix = {};
    }

    // 预处理单词,找出共同字母
    preprocessWords(words) {
        for (let i = 0; i < words.length; i++) {
            const word1 = words[i].text;
            this.intersectionMatrix[word1] = {};
            
            for (let j = 0; j < words.length; j++) {
                if (i === j) continue;
                const word2 = words[j].text;
                
                let intersections = [];
                for (let x = 0; x < word1.length; x++) {
                    for (let y = 0; y < word2.length; y++) {
                        if (word1[x] === word2[y]) {
                            intersections.push({char: word1[x], pos1: x, pos2: y});
                        }
                    }
                }
                
                if (intersections.length > 0) {
                    this.intersectionMatrix[word1][word2] = intersections;
                    console.log(`Found ${intersections.length} intersections between ${word1} and ${word2}`);
                }
            }
        }
    }

    generatePuzzle(words) {
        if (!Array.isArray(words) || words.length < 2) {
            throw new Error('At least 2 words are required');
        }

        this.reset();
        this.preprocessWords(words);

        // 按分数排序单词(长度 + 交叉点数量 + 常用字母)
        const sortedWords = [...words].sort((a, b) => {
            const scoreA = this.calculateWordScore(a.text);
            const scoreB = this.calculateWordScore(b.text);
            return scoreB - scoreA;
        });

        // 增加初始网格大小
        this.size = Math.max(
            sortedWords[0].text.length + 6,
            Math.ceil(Math.sqrt(words.reduce((sum, word) => sum + word.text.length, 0) * 2.2))
        );

        // 多次尝试生成拼图
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                this.grid = Array(this.size).fill(null)
                    .map(() => Array(this.size).fill(null));
                this.placedWords = [];
                this.wordNumber = 1;

                // 放置第一个单词
                const firstWord = sortedWords[0];
                const centerRow = Math.floor(this.size / 2);
                const centerCol = Math.floor(this.size / 2);
                const offset = Math.floor(Math.random() * 3) - 1;
                
                const startRow = centerRow + offset;
                const startCol = centerCol + offset;
                const firstWordHorizontal = Math.random() < 0.5;
                
                this.placeWord(firstWord, startRow, startCol, firstWordHorizontal);

                // 尝试放置其余单词
                let placedCount = 1;
                for (let i = 1; i < sortedWords.length; i++) {
                    if (this.placeNextWord(sortedWords[i])) {
                        placedCount++;
                    }
                    // 如果已经放置足够多的单词,可以提前结束
                    if (placedCount >= this.minWordsRequired && 
                        placedCount >= words.length * 0.6) { // 至少放置60%的单词
                        break;
                    }
                }

                // 如果放置的单词数量达到要求
                if (placedCount >= this.minWordsRequired) {
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

    // 新增:计算单词分数
    calculateWordScore(word) {
        let score = 0;
        
        // 长度分数
        score += word.length * 10;
        
        // 常用字母分数
        const commonLetters = 'AEIORSTN';
        for (let char of word) {
            if (commonLetters.includes(char)) {
                score += 5;
            }
        }
        
        // 交叉点分数
        const intersections = Object.keys(this.intersectionMatrix[word] || {}).length;
        score += intersections * 15;
        
        return score;
    }

    placeNextWord(word) {
        const intersections = [];
        const wordIntersections = this.intersectionMatrix[word.text] || {};
        
        // 寻找所有可能的放置位置
        for (const placedWord of this.placedWords) {
            const crossPoints = wordIntersections[placedWord.text] || [];
            
            for (const point of crossPoints) {
                // 尝试水平放置
                const rowH = placedWord.row;
                const colH = placedWord.col + (placedWord.horizontal ? point.pos2 : 0);
                if (this.canPlaceWord(word.text, rowH, colH - point.pos1, true)) {
                    const score = this.calculatePlacementScore(word.text, rowH, colH - point.pos1, true);
                    intersections.push({
                        row: rowH,
                        col: colH - point.pos1,
                        horizontal: true,
                        score: score
                    });
                }
                
                // 尝试垂直放置
                const rowV = placedWord.row - point.pos1;
                const colV = placedWord.col;
                if (this.canPlaceWord(word.text, rowV, colV, false)) {
                    const score = this.calculatePlacementScore(word.text, rowV, colV, false);
                    intersections.push({
                        row: rowV,
                        col: colV,
                        horizontal: false,
                        score: score
                    });
                }
            }
        }

        // 如果找到可放置位置
        if (intersections.length > 0) {
            // 随机选择一个高分位置(增加随机性)
            intersections.sort((a, b) => b.score - a.score);
            const topScores = intersections.slice(0, Math.min(3, intersections.length));
            const selected = topScores[Math.floor(Math.random() * topScores.length)];
            
            this.placeWord(word, selected.row, selected.col, selected.horizontal);
            return true;
        }

        return false; // 无法放置该单词
    }

    calculatePlacementScore(word, row, col, horizontal) {
        let score = 0;
        let intersectionCount = 0;
        let adjacentCount = 0;

        for (let i = 0; i < word.length; i++) {
            const currentRow = horizontal ? row : row + i;
            const currentCol = horizontal ? col + i : col;

            // 增加交叉点权重
            if (this.grid[currentRow][currentCol] === word[i]) {
                intersectionCount++;
                score += 30; // 增加交叉点权重
            }

            // 检查相邻字母
            const adjacentPositions = [
                {r: currentRow - 1, c: currentCol},
                {r: currentRow + 1, c: currentCol},
                {r: currentRow, c: currentCol - 1},
                {r: currentRow, c: currentCol + 1}
            ];

            for (const pos of adjacentPositions) {
                if (pos.r >= 0 && pos.r < this.size && pos.c >= 0 && pos.c < this.size) {
                    if (this.grid[pos.r][pos.c] !== null) {
                        if (this.isPartOfCrossword(pos.r, pos.c)) {
                            adjacentCount++;
                            score += 5; // 适当降低相邻奖励
                        }
                    }
                }
            }
        }

        // 调整中心位置的影响
        const centerRow = this.size / 2;
        const centerCol = this.size / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        
        score -= distanceFromCenter * 0.5; // 减少中心位置的影响

        // 增加元音交叉的奖励
        if (intersectionCount > 0) {
            const intersectingChar = this.grid[row][col];
            if (/[aeiou]/i.test(intersectingChar)) {
                score += 15;
            }
        }

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