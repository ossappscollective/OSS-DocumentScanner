// [a, b, c, d, tx, ty]: x' = a*x + c*y + tx, y' = b*x + d*y + ty
export type Affine = [number, number, number, number, number, number];

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

// applies `first`, then `second`
export function multiply(first: Affine, second: Affine): Affine {
    const [a1, b1, c1, d1, tx1, ty1] = first;
    const [a2, b2, c2, d2, tx2, ty2] = second;
    return [a2 * a1 + c2 * b1, b2 * a1 + d2 * b1, a2 * c1 + c2 * d1, b2 * c1 + d2 * d1, a2 * tx1 + c2 * ty1 + tx2, b2 * tx1 + d2 * ty1 + ty2];
}

export function invert(matrix: Affine): Affine {
    const [a, b, c, d, tx, ty] = matrix;
    const determinant = a * d - b * c;
    if (!determinant) {
        return [1, 0, 0, 1, 0, 0];
    }
    return [d / determinant, -b / determinant, -c / determinant, a / determinant, (c * ty - d * tx) / determinant, (b * tx - a * ty) / determinant];
}

export function applyToPoint(matrix: Affine, x: number, y: number) {
    return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}

// image pixels (OCR runs on the unrotated image) to view points, for an image rotated clockwise by a multiple of 90 and fit (aspectFit) in the view
export function getFitMatrix({
    imageHeight,
    imageWidth,
    rotation,
    viewHeight,
    viewWidth
}: {
    imageWidth: number;
    imageHeight: number;
    rotation: number;
    viewWidth: number;
    viewHeight: number;
}): Affine {
    if (!imageWidth || !imageHeight || !viewWidth || !viewHeight) {
        return [1, 0, 0, 1, 0, 0];
    }
    const quarterTurns = (((Math.round(rotation / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    const cos = [1, 0, -1, 0][quarterTurns];
    const sin = [0, 1, 0, -1][quarterTurns];
    const swapped = quarterTurns % 2 === 1;
    const scale = Math.min(viewWidth / (swapped ? imageHeight : imageWidth), viewHeight / (swapped ? imageWidth : imageHeight));
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const a = scale * cos;
    const b = scale * sin;
    const c = -scale * sin;
    const d = scale * cos;
    return [a, b, c, d, viewWidth / 2 - (a * centerX + c * centerY), viewHeight / 2 - (b * centerX + d * centerY)];
}

// `matrix` maps image pixels to view points. -1 when no block is under the point, the smallest one when they overlap
export function getBlockAt(blocks: { box: Box }[], matrix: Affine, x: number, y: number) {
    const point = applyToPoint(invert(matrix), x, y);
    let result = -1;
    let resultArea = Infinity;
    blocks.forEach(({ box }, index) => {
        const area = box.width * box.height;
        if (point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height && area < resultArea) {
            result = index;
            resultArea = area;
        }
    });
    return result;
}

// where each block text sits in the full text: blocks are in order, one which is empty or not found has no range
export function getBlockRanges(text: string, blocks: { text: string }[]) {
    let position = 0;
    return blocks.map((block) => {
        const start = block.text ? text.indexOf(block.text, position) : -1;
        if (start === -1) {
            return null;
        }
        position = start + block.text.length;
        return { start, end: position };
    });
}

// what the OCR pages share: the page which is shown (its index in the document) and its selected block, the text drawn on the image, and a counter to redraw after the data changed
export interface OCRViewState {
    page: number;
    block: number;
    showText: boolean;
    version: number;
}
