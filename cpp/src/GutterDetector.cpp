// SPDX-License-Identifier: GPL-3.0-or-later
// Inspired by the page-split / gutter detection in scantailor-advanced
// (https://github.com/farfromrefug/scantailor-advanced)
// Reimplemented as a standalone OpenCV-only module — no Qt, no scantailor types.

#include "include/GutterDetector.h"

#include <opencv2/imgproc.hpp>
#include <algorithm>
#include <numeric>
#include <cmath>

namespace gutter {

GutterResult detectGutter(const cv::Mat& input,
                          float minPageWidthRatio,
                          int   blurSize,
                          float significanceGap)
{
    GutterResult result;

    if (input.empty()) return result;

    // ── 1. Portrait images are never two-page spreads ─────────────────────
    const int width  = input.cols;
    const int height = input.rows;
    if (height > width) return result; // portrait → no gutter

    // ── 2. Convert to grayscale ───────────────────────────────────────────
    cv::Mat gray;
    if (input.channels() == 1)
        gray = input.clone();
    else
        cv::cvtColor(input, gray, cv::COLOR_BGR2GRAY);

    // Optional light blur to reduce noise before column profiling
    if (blurSize > 1) {
        int k = (blurSize % 2 == 0) ? blurSize + 1 : blurSize;
        cv::GaussianBlur(gray, gray, cv::Size(k, k), 0);
    }

    // ── 3. Per-column mean brightness ─────────────────────────────────────
    // Dark columns (shadow at the binding crease) have low mean intensity.
    cv::Mat colSum;
    cv::reduce(gray, colSum, 0, cv::REDUCE_AVG, CV_32F);
    // colSum is 1×width, row 0
    std::vector<float> colMean(width);
    for (int i = 0; i < width; i++)
        colMean[i] = colSum.at<float>(0, i);

    // ── 4. Per-column horizontal-gradient energy ──────────────────────────
    // At the gutter the image is smooth (no text edges crossing the binding).
    cv::Mat sobelX;
    cv::Sobel(gray, sobelX, CV_32F, 1, 0, 3);
    cv::Mat absX;
    cv::convertScaleAbs(sobelX, absX);
    cv::Mat colGradMat;
    cv::reduce(absX, colGradMat, 0, cv::REDUCE_AVG, CV_32F);
    std::vector<float> colGrad(width);
    for (int i = 0; i < width; i++)
        colGrad[i] = colGradMat.at<float>(0, i);

    // ── 5. Normalise both profiles to [0, 1] ──────────────────────────────
    float meanMin = *std::min_element(colMean.begin(), colMean.end());
    float meanMax = *std::max_element(colMean.begin(), colMean.end());
    float gradMin = *std::min_element(colGrad.begin(), colGrad.end());
    float gradMax = *std::max_element(colGrad.begin(), colGrad.end());

    float meanRange = std::max(meanMax - meanMin, 1e-6f);
    float gradRange = std::max(gradMax - gradMin, 1e-6f);

    // Combined "gutterScore": low score = likely gutter
    //   darkness component: (colMean - meanMin) / meanRange  → 0 = darkest
    //   gradient component: (colGrad - gradMin) / gradRange  → 0 = smoothest
    const float kDarkWeight = 0.6f;
    const float kGradWeight = 0.4f;
    std::vector<float> gutterScore(width);
    for (int i = 0; i < width; i++) {
        float darkComp = (colMean[i] - meanMin) / meanRange;
        float gradComp = (colGrad[i] - gradMin) / gradRange;
        gutterScore[i] = kDarkWeight * darkComp + kGradWeight * gradComp;
    }

    // ── 6. Smooth column score profile ────────────────────────────────────
    std::vector<float> smoothScore(width);
    {
        cv::Mat scoreRow(1, width, CV_32F, gutterScore.data());
        cv::Mat smoothRow;
        cv::GaussianBlur(scoreRow, smoothRow, cv::Size(15, 1), 0);
        for (int i = 0; i < width; i++)
            smoothScore[i] = smoothRow.at<float>(0, i);
    }

    // ── 7. Find valley in centre 30–70 % of width ─────────────────────────
    const int searchMin = (int)(width * 0.30f);
    const int searchMax = (int)(width * 0.70f);
    if (searchMin >= searchMax) return result;

    int   gutterX    = searchMin;
    float valleyScore = smoothScore[searchMin];
    for (int i = searchMin + 1; i < searchMax; i++) {
        if (smoothScore[i] < valleyScore) {
            valleyScore = smoothScore[i];
            gutterX    = i;
        }
    }

    // ── 8. Statistical significance test ──────────────────────────────────
    // Compute mean score in flanking regions (10–30 % and 70–90 %).
    // The valley must be at least kSignificanceGap below the flank mean,
    // otherwise there is no real gutter (single-page document).
    float flankSum = 0.0f; int flankCnt = 0;
    for (int i = (int)(width * 0.10f); i < searchMin; i++) {
        flankSum += smoothScore[i]; flankCnt++;
    }
    for (int i = searchMax; i < (int)(width * 0.90f); i++) {
        flankSum += smoothScore[i]; flankCnt++;
    }
    float flankMean = (flankCnt > 0) ? flankSum / flankCnt : 1.0f;

    if (flankMean - valleyScore < significanceGap) {
        // No statistically significant gutter
        return result; // foundGutter = false
    }

    // ── 9. Build page ROIs ─────────────────────────────────────────────────
    result.gutterX = gutterX;
    int minWidth = static_cast<int>(width * minPageWidthRatio);

    if (gutterX > minWidth) {
        result.leftPage = cv::Rect(0, 0, gutterX, height);
        result.hasLeft  = true;
    }
    if (width - gutterX > minWidth) {
        result.rightPage = cv::Rect(gutterX, 0, width - gutterX, height);
        result.hasRight  = true;
    }

    result.foundGutter = result.hasLeft || result.hasRight;
    return result;
}

} // namespace gutter
