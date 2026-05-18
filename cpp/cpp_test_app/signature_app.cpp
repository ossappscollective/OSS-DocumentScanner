/*
 * signature_app.cpp
 */

#include <QApplication>
#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QCheckBox>
#include <QSlider>
#include <QGroupBox>
#include <QPainter>
#include <QPainterPath>
#include <QFile>
#include <QSpinBox>
#include <QDoubleSpinBox>
#include <QFormLayout>
#include <QComboBox>
#include <QTextStream>
#include <QFont>
#include <QLabel>
#include <QElapsedTimer>

#include <QCamera>
#include <QMediaCaptureSession>
#include <QVideoSink>
#include <QVideoFrame>

#include <opencv2/opencv.hpp>

#include <cmath>
#include <vector>
#include <array>
#include <algorithm>

// ═════════════════════════════════════════════════════════════════════════════
//  Cubic Bézier fitting  (Schneider 1990, recursive least-squares)
// ═════════════════════════════════════════════════════════════════════════════
namespace BezFit {
using P2 = cv::Point2f;
inline float len(P2 a,P2 b){float dx=a.x-b.x,dy=a.y-b.y;return std::sqrt(dx*dx+dy*dy);}
inline P2   sub(P2 a,P2 b){return{a.x-b.x,a.y-b.y};}
inline P2   add(P2 a,P2 b){return{a.x+b.x,a.y+b.y};}
inline P2   mul(P2 a,float s){return{a.x*s,a.y*s};}
inline float dot(P2 a,P2 b){return a.x*b.x+a.y*b.y;}
inline P2   nrm(P2 a){float l=std::sqrt(dot(a,a));return l>1e-6f?mul(a,1/l):a;}

struct Cubic{P2 p0,p1,p2,p3;};

static std::vector<float> chordParam(const std::vector<P2>&pts){
    int n=int(pts.size());std::vector<float>u(n,0);
    for(int i=1;i<n;i++)u[i]=u[i-1]+len(pts[i],pts[i-1]);
    float t=u.back();if(t>1e-6f)for(auto&v:u)v/=t;
    return u;
}
static P2 evalC(const Cubic&c,float t){
    float m=1-t;
    return add(add(mul(c.p0,m*m*m),mul(c.p1,3*m*m*t)),
               add(mul(c.p2,3*m*t*t),mul(c.p3,t*t*t)));
}
static Cubic fit1(const std::vector<P2>&pts,int f,int l,P2 t1,P2 t2,const std::vector<float>&u){
    int n=l-f+1;
    float chordLen=len(pts[f],pts[l]);
    float maxDist=chordLen/3.f;
    if(maxDist<0.5f)maxDist=0.5f;
    if(n==2){return{pts[f],add(pts[f],mul(t1,maxDist)),add(pts[l],mul(t2,maxDist)),pts[l]};}
    std::array<std::array<float,2>,2>C{};std::array<float,2>X{};
    for(int i=0;i<n;i++){
        float t=u[f+i],m=1-t;
        P2 A0=mul(t1,3*m*m*t),A1=mul(t2,3*m*t*t);
        C[0][0]+=dot(A0,A0);C[0][1]+=dot(A0,A1);C[1][0]=C[0][1];C[1][1]+=dot(A1,A1);
        P2 fix=add(mul(pts[f],m*m*m+3*m*m*t),mul(pts[l],3*m*t*t+t*t*t));
        P2 tmp=sub(pts[f+i],fix);
        X[0]+=dot(A0,tmp);X[1]+=dot(A1,tmp);
    }
    float det=C[0][0]*C[1][1]-C[0][1]*C[1][0];
    float a1,a2;
    if(std::abs(det)<1e-12f){a1=a2=maxDist;}
    else{a1=(X[0]*C[1][1]-X[1]*C[0][1])/det;a2=(C[0][0]*X[1]-C[1][0]*X[0])/det;}
    a1=std::clamp(a1,0.f,maxDist);
    a2=std::clamp(a2,0.f,maxDist);
    return{pts[f],add(pts[f],mul(t1,a1)),add(pts[l],mul(t2,a2)),pts[l]};
}
static float errMax(const std::vector<P2>&pts,int f,int l,const Cubic&c,const std::vector<float>&u,int&sp){
    float mx=0;sp=(f+l)/2;
    for(int i=f+1;i<l;i++){float d=len(evalC(c,u[i]),pts[i]);if(d>mx){mx=d;sp=i;}}
    return mx;
}
static void fitRec(const std::vector<P2>&pts,int f,int l,P2 t1,P2 t2,float tol2,
                   std::vector<Cubic>&out,const std::vector<float>&u){
    if(l<=f)return;
    if(l-f==1){float d=len(pts[f],pts[l])/3.f;out.push_back({pts[f],add(pts[f],mul(t1,d)),add(pts[l],mul(t2,d)),pts[l]});return;}
    Cubic c=fit1(pts,f,l,t1,t2,u);
    int sp;float e=errMax(pts,f,l,c,u,sp);
    if(e<tol2){out.push_back(c);return;}
    P2 mt=nrm(sub(pts[std::min(sp+1,l)],pts[std::max(sp-1,f)]));
    fitRec(pts,f,sp,t1,mt,tol2,out,u);
    fitRec(pts,sp,l,{-mt.x,-mt.y},t2,tol2,out,u);
}
std::vector<Cubic> fit(const std::vector<P2>&pts,float tol=2.0f){
    std::vector<Cubic>out;
    if(pts.size()<2)return out;
    auto u=chordParam(pts);int n=int(pts.size())-1;
    fitRec(pts,0,n,nrm(sub(pts[1],pts[0])),nrm(sub(pts[n-1],pts[n])),tol*tol,out,u);
    return out;
}
} // BezFit

// ═════════════════════════════════════════════════════════════════════════════
//  Gaussian smoothing of closed contour points
//  ★ Precomputed kernel — avoids per-point exp() calls
// ═════════════════════════════════════════════════════════════════════════════
static std::vector<cv::Point> smoothContourPoints(
    const std::vector<cv::Point>& ctr, int radius)
{
    int n=(int)ctr.size();
    if(radius<=0||n<6)return ctr;

    // Precompute Gaussian kernel once (not per-point)
    float sigma=std::max(1.0f,float(radius)/2.5f);
    int kSize=2*radius+1;
    std::vector<float> w(kSize);
    float sw=0;
    for(int k=-radius;k<=radius;k++){
        float v=std::exp(-0.5f*(k/sigma)*(k/sigma));
        w[k+radius]=v; sw+=v;
    }
    for(auto&v:w) v/=sw;

    std::vector<cv::Point> out(n);
    for(int i=0;i<n;i++){
        float sx=0,sy=0;
        for(int k=0;k<kSize;k++){
            int idx=((i+k-radius)%n+n)%n;
            sx+=ctr[idx].x*w[k];
            sy+=ctr[idx].y*w[k];
        }
        out[i].x=int(std::round(sx));
        out[i].y=int(std::round(sy));
    }
    return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Contour → smooth cubic Bézier helpers
//  ★ CHAIN_APPROX_SIMPLE: ~5-10× fewer points than NONE for same shape
//    Gaussian smoothing rounds the staircases; approxPolyDP handles the rest
// ═════════════════════════════════════════════════════════════════════════════

static void addContourToPath(QPainterPath &fp,
                              const std::vector<cv::Point> &ctr,
                              double approxEps, int smoothRadius)
{
    if(ctr.size()<4)return;
    std::vector<cv::Point> smoothed=smoothContourPoints(ctr,smoothRadius);
    std::vector<cv::Point> approx;
    cv::approxPolyDP(smoothed,approx,approxEps,true);
    if(approx.size()<3)return;
    std::vector<BezFit::P2> pts;
    pts.reserve(approx.size()+1);
    for(auto&p:approx)pts.push_back({float(p.x),float(p.y)});
    pts.push_back(pts.front());
    auto curves=BezFit::fit(pts,float(approxEps*0.5));
    if(curves.empty())return;
    fp.moveTo(curves[0].p0.x,curves[0].p0.y);
    for(auto&c:curves)
        fp.cubicTo(c.p1.x,c.p1.y,c.p2.x,c.p2.y,c.p3.x,c.p3.y);
    fp.closeSubpath();
}

static QPainterPath maskToPath(const cv::Mat &mask, double approxEps,
                                int minArea, int smoothRadius)
{
    std::vector<std::vector<cv::Point>>ctrs;
    std::vector<cv::Vec4i>hier;
    cv::findContours(mask,ctrs,hier,cv::RETR_CCOMP,cv::CHAIN_APPROX_SIMPLE);
    QPainterPath fp;
    fp.setFillRule(Qt::OddEvenFill);
    for(int i=0;i<int(ctrs.size());i++){
        if(hier[i][3]!=-1)continue;
        if(cv::contourArea(ctrs[i])<minArea)continue;
        addContourToPath(fp,ctrs[i],approxEps,smoothRadius);
        for(int j=0;j<int(ctrs.size());j++){
            if(hier[j][3]!=i)continue;
            if(cv::contourArea(ctrs[j])<minArea*0.1)continue;
            addContourToPath(fp,ctrs[j],approxEps,smoothRadius);
        }
    }
    return fp;
}

static QString contourToSVGPath(const std::vector<cv::Point> &ctr,
                                 double approxEps, int smoothRadius)
{
    if(ctr.size()<4)return{};
    std::vector<cv::Point> smoothed=smoothContourPoints(ctr,smoothRadius);
    std::vector<cv::Point> approx;
    cv::approxPolyDP(smoothed,approx,approxEps,true);
    if(approx.size()<3)return{};
    std::vector<BezFit::P2> pts;
    pts.reserve(approx.size()+1);
    for(auto&p:approx)pts.push_back({float(p.x),float(p.y)});
    pts.push_back(pts.front());
    auto curves=BezFit::fit(pts,float(approxEps*0.5));
    if(curves.empty())return{};
    QString d;QTextStream s(&d);
    s.setRealNumberPrecision(2);s.setRealNumberNotation(QTextStream::FixedNotation);
    s<<"M "<<curves[0].p0.x<<" "<<curves[0].p0.y<<" ";
    for(auto&c:curves)
        s<<"C "<<c.p1.x<<" "<<c.p1.y<<" "
          <<c.p2.x<<" "<<c.p2.y<<" "
          <<c.p3.x<<" "<<c.p3.y<<" ";
    s<<"Z";
    return d;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Baseline detection
//  ★ Subsample columns: check every 2nd column (halves iteration)
// ═════════════════════════════════════════════════════════════════════════════

struct Baseline {
    float angle = 0;
    float xCenter = 0;
    float yCenter = 0;
    bool valid = false;
};

static Baseline detectBaseline(const cv::Mat &mask) {
    Baseline bl;
    bl.valid = false;
    if(mask.empty() || cv::countNonZero(mask) < 50) return bl;

    std::vector<cv::Point2f> bottomPts;
    bottomPts.reserve(mask.cols / 2);
    // Subsample: every 2nd column is enough for a line fit
    for(int x = 0; x < mask.cols; x += 2){
        for(int y = mask.rows - 1; y >= 0; y--){
            if(mask.at<uchar>(y, x) > 0){
                bottomPts.push_back(cv::Point2f(x, y));
                break;
            }
        }
    }
    if((int)bottomPts.size() < 10) return bl;

    cv::Vec4f line;
    cv::fitLine(bottomPts, line, cv::DIST_L2, 0, 0.01, 0.01);
    float vx=line[0], vy=line[1], x0=line[2], y0=line[3];

    float a = -vy, b = vx, c = vy*x0 - vx*y0;
    float nrm = std::sqrt(a*a + b*b);

    float maxDist = mask.rows * 0.15f;
    std::vector<cv::Point2f> inliers;
    inliers.reserve(bottomPts.size());
    for(auto &p : bottomPts){
        float d = std::abs(a*p.x + b*p.y + c) / nrm;
        if(d < maxDist) inliers.push_back(p);
    }
    if((int)inliers.size() < 8) return bl;

    cv::fitLine(inliers, line, cv::DIST_L2, 0, 0.01, 0.01);
    vx=line[0]; vy=line[1];

    float angle = std::atan2(vy, vx) * 180.0f / CV_PI;
    while(angle >  45) angle -= 90;
    while(angle < -45) angle += 90;

    if(std::abs(angle) > 20) return bl;

    bl.angle = angle;
    float sumX=0, sumY=0;
    for(auto &p : inliers){ sumX += p.x; sumY += p.y; }
    bl.xCenter = sumX / inliers.size();
    bl.yCenter = sumY / inliers.size();
    bl.valid = true;
    return bl;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Paper detection: find rectangular paper shape only
//
//  ★ Runs at 1/4 resolution (1/16th area) — paper geometry doesn't need
//    pixel precision. Dilation is done at full res after upscaling.
// ═════════════════════════════════════════════════════════════════════════════

static cv::Mat detectPaperInner(const cv::Mat &bin) {
    std::vector<std::vector<cv::Point>> ctrs;
    cv::findContours(bin, ctrs, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);

    double frameArea = double(bin.total());

    for(int i = 0; i < (int)ctrs.size(); i++){
        double area = cv::contourArea(ctrs[i]);
        if(area < frameArea * 0.20) continue;

        std::vector<cv::Point> approx;
        double peri = cv::arcLength(ctrs[i], true);
        cv::approxPolyDP(ctrs[i], approx, 0.02 * peri, true);

        if(approx.size() != 4) continue;
        if(!cv::isContourConvex(approx)) continue;

        bool goodAngles = true;
        for(int j = 0; j < 4; j++){
            cv::Point p1 = approx[(j+3)%4];
            cv::Point p2 = approx[j];
            cv::Point p3 = approx[(j+1)%4];
            double dx1 = p1.x - p2.x, dy1 = p1.y - p2.y;
            double dx2 = p3.x - p2.x, dy2 = p3.y - p2.y;
            double d = std::sqrt(dx1*dx1+dy1*dy1) * std::sqrt(dx2*dx2+dy2*dy2);
            if(d < 1e-6){ goodAngles = false; break; }
            double cosA = (dx1*dx2 + dy1*dy2) / d;
            double ang = std::acos(std::clamp(cosA, -1.0, 1.0)) * 180.0 / CV_PI;
            if(ang < 70 || ang > 110){ goodAngles = false; break; }
        }
        if(!goodAngles) continue;

        // Return mask at this (small) resolution — no dilation here
        cv::Mat paperMask = cv::Mat::zeros(bin.size(), CV_8U);
        cv::drawContours(paperMask, ctrs, i, 255, cv::FILLED);
        return paperMask;
    }
    return cv::Mat();
}

static cv::Mat detectPaper(const cv::Mat &gray) {
    // Downscale to 1/4 — paper rect detection is pure geometry
    const int S = 4;
    cv::Mat small;
    // cv::resize(gray, small, cv::Size(), 1.0/S, 1.0/S, cv::INTER_AREA);

    cv::Mat blurred;
    cv::GaussianBlur(gray, blurred, cv::Size(5,5), 0);

    cv::Mat bin;
    cv::threshold(blurred, bin, 0, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

    cv::Mat smallMask = detectPaperInner(bin);
    if(smallMask.empty()){
        cv::Mat inv;
        cv::bitwise_not(bin, inv);
        smallMask = detectPaperInner(inv);
    }
    // if(smallMask.empty()) return cv::Mat();

    // Upscale mask to full resolution with nearest-neighbor
    // cv::Mat fullMask;
    // cv::resize(smallMask, fullMask, gray.size(), 0, 0, cv::INTER_NEAREST);

    // // Dilation at full res (5px at full scale, not scaled-up from 1/4)
    // cv::Mat el = cv::getStructuringElement(cv::MORPH_ELLIPSE, {5, 5});
    // cv::dilate(fullMask, fullMask, el);

    return smallMask;
}

// ═════════════════════════════════════════════════════════════════════════════
//  High-quality PNG rendering – distance-transform ink model (vectorized)
// ═════════════════════════════════════════════════════════════════════════════
static QImage renderPNG(const cv::Mat &binMask,
                         int upScale, int dilateRadius,
                         float edgeWidth, float sharpenAmt,
                         int outScale, float, int alpha)
{
    cv::Mat m=binMask.clone();
    if(dilateRadius>0){
        int ks=dilateRadius*2+1;
        cv::Mat el=cv::getStructuringElement(cv::MORPH_ELLIPSE,{ks,ks});
        cv::dilate(m,m,el);
    }
    int uW=m.cols*upScale,uH=m.rows*upScale;
    cv::Mat mUp;
    cv::resize(m,mUp,{uW,uH},0,0,cv::INTER_LINEAR);
    cv::threshold(mUp,mUp,127,255,cv::THRESH_BINARY);

    cv::Mat bg8;cv::bitwise_not(mUp,bg8);
    cv::Mat dtIn,dtOut;
    cv::distanceTransform(mUp,dtIn, cv::DIST_L2,cv::DIST_MASK_PRECISE);
    cv::distanceTransform(bg8,dtOut,cv::DIST_L2,cv::DIST_MASK_PRECISE);

    cv::Mat sdf;
    cv::subtract(dtIn, dtOut, sdf);

    float hw=std::max(0.5f,edgeWidth*float(upScale));
    cv::Mat negSdf = -sdf / hw;
    cv::Mat expMat;
    cv::exp(negSdf, expMat);
    cv::Mat alphaF = 1.0 / (1.0 + expMat);

    if(sharpenAmt>0.01f){
        cv::Mat blurred;
        cv::GaussianBlur(alphaF,blurred,cv::Size(0,0),hw*1.5f);
        cv::Mat sharpened = alphaF + sharpenAmt*(alphaF - blurred);
        cv::threshold(sharpened,sharpened,0,0,cv::THRESH_TOZERO);
        cv::min(sharpened, 1.0, sharpened);

        cv::Mat blend = alphaF / 0.85f;
        cv::min(blend, 1.0, blend);
        cv::multiply(blend, blend, blend);

        cv::Mat invBlend = 1.0 - blend;
        alphaF = alphaF.mul(invBlend) + sharpened.mul(blend);
    }

    float masterA=float(alpha)/255.f;
    alphaF *= masterA;
    cv::min(alphaF, 1.0, alphaF);

    cv::Mat alphaU8;
    alphaF.convertTo(alphaU8, CV_8U, 255.0);

    cv::Mat result(uH, uW, CV_8UC4, cv::Scalar(0,0,0,0));
    int fromTo[] = {0, 3};
    cv::mixChannels({alphaU8}, {result}, fromTo, 1);

    int outW=m.cols*outScale,outH=m.rows*outScale;
    cv::Mat final_;
    if(outW==uW&&outH==uH) final_=result;
    else cv::resize(result,final_,{outW,outH},0,0,cv::INTER_AREA);
    return QImage(final_.data,final_.cols,final_.rows,
                  int(final_.step),QImage::Format_RGBA8888).copy();
}

// ═════════════════════════════════════════════════════════════════════════════
//  CameraView
// ═════════════════════════════════════════════════════════════════════════════
class CameraView : public QWidget {
    Q_OBJECT
public:
    explicit CameraView(QWidget*p=nullptr):QWidget(p){
        setMinimumSize(640,480);
        setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Expanding);
    }
    void setFrame(const QPixmap&cam,const QPixmap&ov,const QRect&sr,
                  const QPixmap&dbg, bool isVec){
        m_cam=cam;m_ov=ov;m_sr=sr;m_dbg=dbg;m_isVec=isVec;QWidget::update();
    }
    QRect computeScanRect(const QSize&ws,const QSize&cs)const{
        if(cs.isEmpty())return{};
        float ratio=85.6f/54.f;
        float sc=std::max(float(ws.width())/cs.width(),float(ws.height())/cs.height());
        int visW=int(ws.width()/sc);
        int sw=int(visW*0.55f),sh=int(sw/ratio);
        return{(cs.width()-sw)/2,(cs.height()-sh)/2,sw,sh};
    }
protected:
    void paintEvent(QPaintEvent*)override{
        if(m_cam.isNull())return;
        QPainter p(this);
        p.setRenderHint(QPainter::SmoothPixmapTransform);
        p.setRenderHint(QPainter::Antialiasing);
        const QSize ws=size(),cs=m_cam.size();
        float sc=std::max(float(ws.width())/cs.width(),float(ws.height())/cs.height());
        int dw=int(cs.width()*sc),dh=int(cs.height()*sc);
        int dx=(ws.width()-dw)/2,dy=(ws.height()-dh)/2;
        auto toW=[&](QRect r)->QRect{
            return{dx+int(r.x()*sc),dy+int(r.y()*sc),
                   int(r.width()*sc),int(r.height()*sc)};};
        QRect sr=toW(m_sr);

        if(m_isVec && !m_ov.isNull()){
            p.setOpacity(0.15);
            p.drawPixmap(QRect(dx,dy,dw,dh),m_cam);
            p.setOpacity(1.0);
            p.setPen(Qt::NoPen);
            p.setBrush(QColor(250,250,250));
            int pad = int(std::min(sr.width(), sr.height()) * 0.08);
            QRect target = sr.adjusted(pad, pad, -pad, -pad);
            QPixmap scaled = m_ov.scaled(target.size(),
                                         Qt::KeepAspectRatio, Qt::SmoothTransformation);
            QRect drawRect(QPoint(0,0), scaled.size());
            int baselineY = sr.top() + int(sr.height() * 0.65f);
            drawRect.moveBottom(baselineY - 4);
            drawRect.moveLeft(sr.center().x() - drawRect.width()/2);
            if(drawRect.left() < sr.left()+pad)
                drawRect.moveLeft(sr.left()+pad);
            if(drawRect.right() > sr.right()-pad)
                drawRect.moveRight(sr.right()-pad);
            if(drawRect.top() < sr.top()+pad)
                drawRect.moveTop(sr.top()+pad);
            p.drawPixmap(drawRect, scaled);
            p.setPen(QPen(QColor(215,215,215),1));
            p.setBrush(Qt::NoBrush);
        } else {
            p.drawPixmap(QRect(dx,dy,dw,dh),m_cam);
            if(!m_ov.isNull()) p.drawPixmap(sr,m_ov);
        }

        p.setPen(QPen(QColor(255,255,255,210),2.5,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));
        int t=20;
        QPoint tl=sr.topLeft(),tr=sr.topRight(),bl=sr.bottomLeft(),br=sr.bottomRight();
        const QLine L[8]={{tl,tl+QPoint(t,0)},{tl,tl+QPoint(0,t)},
                          {tr,tr+QPoint(-t,0)},{tr,tr+QPoint(0,t)},
                          {bl,bl+QPoint(t,0)},{bl,bl+QPoint(0,-t)},
                          {br,br+QPoint(-t,0)},{br,br+QPoint(0,-t)}};
        p.drawLines(L,8);
        int by=sr.top()+int(sr.height()*0.65f);
        p.setPen(QPen(QColor(255,255,255,120),1));
        p.drawLine(sr.left()+10,by,sr.right()-10,by);
        p.setPen(QColor(255,255,255,140));
        QFont f=p.font();f.setPointSizeF(8.5);p.setFont(f);
        p.drawText(sr.left()+12,by+13,"Sign here");

        if(!m_dbg.isNull()){
            int tw=200,th=int(tw*float(m_dbg.height())/m_dbg.width());
            QRect dr(ws.width()-tw-10,ws.height()-th-10,tw,th);
            p.setOpacity(0.85);
            p.fillRect(dr.adjusted(-2,-2,2,2),QColor(0,0,0,170));
            p.drawPixmap(dr,m_dbg);
            p.setOpacity(1.0);
            p.setPen(QColor(255,255,255,50));p.drawRect(dr);
            p.setPen(QColor(255,255,255,100));
            QFont lf=p.font();lf.setPointSizeF(7);p.setFont(lf);
            p.drawText(dr.left()+3,dr.top()-2,"processed mask");
        }
    }
private:
    QPixmap m_cam,m_ov,m_dbg;
    QRect m_sr;
    bool m_isVec = false;
};

// ═════════════════════════════════════════════════════════════════════════════
//  MainWindow
// ═════════════════════════════════════════════════════════════════════════════
class MainWindow : public QWidget {
    Q_OBJECT
public:
    MainWindow(){
        setWindowTitle("Signature Scanner");
        setStyleSheet(R"(
            QWidget{background:#1c1c1e;color:#f0f0f0;font-size:12px;}
            QGroupBox{border:1px solid #3a3a3c;border-radius:6px;margin-top:10px;padding:6px 4px 4px 4px;}
            QGroupBox::title{subcontrol-origin:margin;left:8px;color:#98989d;font-size:11px;}
            QSlider::groove:horizontal{height:3px;background:#3a3a3c;border-radius:2px;}
            QSlider::handle:horizontal{width:13px;height=13px;margin:-5px 0;background:#fff;border-radius:7px;}
            QSlider::sub-page:horizontal{background:#0a84ff;border-radius:2px;}
            QPushButton{background:#2c2c2e;border:1px solid #48484a;border-radius:7px;padding:6px 10px;}
            QPushButton:hover{background:#3a3a3c;}
            QCheckBox::indicator{width:15px;height:15px;border-radius:4px;border:1px solid #555;background:#2c2c2e;}
            QCheckBox::indicator:checked{background:#0a84ff;border-color:#0a84ff;}
            QComboBox,QSpinBox,QDoubleSpinBox{background:#2c2c2e;border:1px solid #48484a;border-radius:5px;padding:3px 6px;}
            QLabel{color:#98989d;font-size:10px;}
        )");

        auto*root=new QHBoxLayout(this);
        root->setSpacing(0);root->setContentsMargins(0,0,0,0);
        cameraView=new CameraView;
        root->addWidget(cameraView,1);

        auto*sb=new QWidget;sb->setFixedWidth(262);
        sb->setStyleSheet("QWidget{background:#111;}");
        auto*sbl=new QVBoxLayout(sb);
        sbl->setContentsMargins(12,14,12,12);sbl->setSpacing(8);

        // ── Detection ───────────────────────────────────────────────────────
        auto*dg=new QGroupBox("Detection");
        auto*dl=new QFormLayout(dg);dl->setSpacing(4);
        threshBlock=mkSl(3,51,11);threshC=mkSl(-10,20,4);
        detectPreDil=mkSl(0,4,0);
        minArea=new QSpinBox;minArea->setRange(10,50000);minArea->setValue(100);
        chkPaper=new QCheckBox("Require white paper");chkPaper->setChecked(true);
        dl->addRow("Block size",threshBlock);
        dl->addRow("Thresh C",threshC);
        dl->addRow("Pre-dilate",detectPreDil);
        dl->addRow("Min area px²",minArea);
        dl->addRow(chkPaper);

        // ── Filtering ───────────────────────────────────────────────────────
        auto*fg=new QGroupBox("Filtering");
        auto*fl=new QFormLayout(fg);fl->setSpacing(4);
        maxBleedGray=mkSl(40,200,120);
        sigZoneTop=mkSl(0,60,20);
        maxTextAspect=new QSpinBox;maxTextAspect->setRange(5,50);maxTextAspect->setValue(15);
        fl->addRow("Bleed-through gray",maxBleedGray);
        fl->addRow("Zone top %",sigZoneTop);
        fl->addRow("Max text W/H",maxTextAspect);
        auto*fInfo=new QLabel("Zone: removes shapes above line.\n"
                               "Bleed: removes faint back-side ink.\n"
                               "W/H: removes wide text lines.");
        fInfo->setWordWrap(true);
        fInfo->setStyleSheet("color:#636366;font-size:9px;padding-top:2px;");
        fl->addRow(fInfo);

        // ── Processing ──────────────────────────────────────────────────────
        auto*pg=new QGroupBox("Processing");
        auto*pl=new QVBoxLayout(pg);pl->setSpacing(3);
        chkInvert=new QCheckBox("Invert (dark bg)");
        chkMorph =new QCheckBox("Morph close");chkMorph->setChecked(true);
        chkAuto  =new QCheckBox("Auto-capture");chkAuto->setChecked(true);
        pl->addWidget(chkInvert);pl->addWidget(chkMorph);pl->addWidget(chkAuto);

        // ── Overlay ─────────────────────────────────────────────────────────
        auto*og=new QGroupBox("Overlay");
        auto*ol=new QFormLayout(og);ol->setSpacing(4);
        overlayMode=new QComboBox;
        overlayMode->addItems({"PNG – crisp ink","Vector – pen strokes"});
        overlayMode->setCurrentIndex(0);
        overlayOpacity=mkSl(10,100,92);
        ol->addRow("Mode",overlayMode);
        ol->addRow("Opacity %",overlayOpacity);

        // ── PNG rendering ───────────────────────────────────────────────────
        auto*xg=new QGroupBox("PNG rendering  (SDF ink model)");
        auto*xl=new QFormLayout(xg);xl->setSpacing(4);
        pngDilate   =mkSl(0,8,1);
        pngBlur     =mkSl(1,30,8);
        pngSharpen  =mkSl(0,30,12);
        pngOutScale =new QSpinBox;pngOutScale->setRange(1,8);pngOutScale->setValue(3);
        pngBezTol   =mkSl(1,30,6);
        xl->addRow("Thicken px",pngDilate);
        xl->addRow("Edge width ×0.1",pngBlur);
        xl->addRow("Snap ×0.1",pngSharpen);
        xl->addRow("Output scale",pngOutScale);
        xl->addRow("Contour tol ×0.1",pngBezTol);

        // ── SVG pen rendering ───────────────────────────────────────────────
        auto*vg=new QGroupBox("SVG / Vector pen");
        auto*vl=new QVBoxLayout(vg);vl->setSpacing(3);

        auto*preRow=new QHBoxLayout;
        svgDilate=mkSl(0,8,0);
        auto*dilLbl=new QLabel("Thicken");dilLbl->setFixedWidth(55);
        preRow->addWidget(dilLbl);preRow->addWidget(svgDilate,1);
        vl->addLayout(preRow);

        svgClose=new QCheckBox("Close gaps");svgClose->setChecked(true);
        vl->addWidget(svgClose);

        svgOrient=new QCheckBox("Straighten baseline");svgOrient->setChecked(false);
        vl->addWidget(svgOrient);

        auto*usRow=new QHBoxLayout;
        svgUpScale=new QSpinBox;svgUpScale->setRange(2,8);svgUpScale->setValue(2);
        auto*usLbl=new QLabel("Upscale");usLbl->setFixedWidth(55);
        usRow->addWidget(usLbl);usRow->addWidget(svgUpScale,1);
        vl->addLayout(usRow);

        auto*areaRow=new QHBoxLayout;
        svgMinArea=new QSpinBox;svgMinArea->setRange(1,5000);svgMinArea->setValue(10);
        auto*maLbl=new QLabel("Min area");maLbl->setFixedWidth(55);
        areaRow->addWidget(maLbl);areaRow->addWidget(svgMinArea,1);
        vl->addLayout(areaRow);

        auto*smRow=new QHBoxLayout;
        svgSmooth=mkSl(0,12,4);
        auto*smLbl=new QLabel("Smooth");smLbl->setFixedWidth(55);
        smRow->addWidget(smLbl);smRow->addWidget(svgSmooth,1);
        vl->addLayout(smRow);

        auto*tolRow=new QHBoxLayout;
        penBezTol=mkSl(2,30,8);
        auto*tolLbl=new QLabel("Simplif.");tolLbl->setFixedWidth(55);
        tolRow->addWidget(tolLbl);tolRow->addWidget(penBezTol,1);
        vl->addLayout(tolRow);

        auto*saveBtn=new QPushButton("💾  Save PNG");
        auto*svgBtn =new QPushButton("📄  Save SVG");
        auto*clrBtn =new QPushButton("✕  Clear");

        sbl->addWidget(dg);sbl->addWidget(fg);sbl->addWidget(pg);sbl->addWidget(og);
        sbl->addWidget(xg);sbl->addWidget(vg);
        sbl->addSpacing(4);
        sbl->addWidget(saveBtn);sbl->addWidget(svgBtn);sbl->addWidget(clrBtn);
        sbl->addStretch();
        root->addWidget(sb);

        connect(saveBtn,&QPushButton::clicked,this,&MainWindow::savePNG);
        connect(svgBtn, &QPushButton::clicked,this,&MainWindow::saveSVG);
        connect(clrBtn, &QPushButton::clicked,this,[this]{
            capturedMask=cv::Mat();
            smoothedBaseline=Baseline();
            hasSmoothedBaseline=false;
        });

        camera=new QCamera(this);
        session=new QMediaCaptureSession(this);
        sink=new QVideoSink(this);
        session->setCamera(camera);session->setVideoSink(sink);
        connect(sink,&QVideoSink::videoFrameChanged,this,&MainWindow::processFrame);
        frameTimer.start();
        camera->start();
    }

private:
    CameraView *cameraView;
    QSlider *threshBlock,*threshC,*overlayOpacity;
    QSlider *pngDilate,*pngBlur,*pngSharpen,*pngBezTol;
    QSlider *svgDilate,*svgSmooth,*penBezTol;
    QSlider *detectPreDil;
    QSlider *maxBleedGray,*sigZoneTop;
    QSpinBox *minArea,*pngOutScale;
    QSpinBox *svgUpScale,*svgMinArea;
    QSpinBox *maxTextAspect;
    QCheckBox *chkInvert,*chkMorph,*chkAuto,*chkPaper;
    QCheckBox *svgClose,*svgOrient;
    QComboBox *overlayMode;

    QCamera *camera;QMediaCaptureSession *session;QVideoSink *sink;
    cv::Mat capturedMask;
    Baseline smoothedBaseline;
    bool hasSmoothedBaseline = false;

    QElapsedTimer frameTimer;

    QSlider*mkSl(int a,int b,int v){auto*s=new QSlider(Qt::Horizontal);s->setRange(a,b);s->setValue(v);return s;}
    int oddV(QSlider*s){int v=s->value();return v%2==0?v+1:v;}

    void updateBaseline(const Baseline &raw){
        if(!raw.valid) return;
        const float alpha = 0.12f;
        if(!hasSmoothedBaseline){
            smoothedBaseline = raw;
            hasSmoothedBaseline = true;
        } else {
            smoothedBaseline.angle   = smoothedBaseline.angle   * (1-alpha) + raw.angle   * alpha;
            smoothedBaseline.xCenter = smoothedBaseline.xCenter * (1-alpha) + raw.xCenter * alpha;
            smoothedBaseline.yCenter = smoothedBaseline.yCenter * (1-alpha) + raw.yCenter * alpha;
        }
    }

    cv::Mat straightenMask(const cv::Mat &mask) const {
        if(!svgOrient->isChecked() || !hasSmoothedBaseline || !smoothedBaseline.valid)
            return mask;
        float angle = -smoothedBaseline.angle;
        if(std::abs(angle) < 0.3f) return mask;

        cv::Point2f center(smoothedBaseline.xCenter, smoothedBaseline.yCenter);
        cv::Mat rot = cv::getRotationMatrix2D(center, angle, 1.0);
        cv::Mat rotated;
        cv::warpAffine(mask, rotated, rot, mask.size(),
                       cv::INTER_NEAREST, cv::BORDER_CONSTANT, 0);

        std::vector<cv::Point> pts;
        cv::findNonZero(rotated, pts);
        if(pts.empty()) return mask;
        cv::Rect bbox = cv::boundingRect(pts);
        int pad = 6;
        bbox.x = std::max(0, bbox.x - pad);
        bbox.y = std::max(0, bbox.y - pad);
        bbox.width  = std::min(rotated.cols - bbox.x, bbox.width  + 2*pad);
        bbox.height = std::min(rotated.rows - bbox.y, bbox.height + 2*pad);
        return rotated(bbox).clone();
    }

    cv::Mat detect(const cv::Mat&roi){
        cv::Mat gray;cv::cvtColor(roi,gray,cv::COLOR_BGR2GRAY);
        cv::GaussianBlur(gray,gray,cv::Size(3,3),0);

        cv::Mat paperMask;
        if(chkPaper->isChecked()){
            paperMask = detectPaper(gray);
            if(paperMask.empty()) return cv::Mat::zeros(gray.size(), CV_8U);
        }

        cv::Mat bin;
        cv::adaptiveThreshold(gray,bin,255,cv::ADAPTIVE_THRESH_GAUSSIAN_C,
            chkInvert->isChecked()?cv::THRESH_BINARY:cv::THRESH_BINARY_INV,
            oddV(threshBlock),threshC->value());

        // Bleed-through removal
        int bleedThresh = maxBleedGray->value();
        cv::Mat darkMask = (gray <= bleedThresh);
        cv::bitwise_and(bin, darkMask, bin);

        int pd=detectPreDil->value();
        if(pd>0){
            int ks=pd*2+1;
            cv::Mat el=cv::getStructuringElement(cv::MORPH_ELLIPSE,{ks,ks});
            cv::dilate(bin,bin,el);
        }

        if(chkMorph->isChecked()){
            cv::Mat k=cv::getStructuringElement(cv::MORPH_ELLIPSE,{3,3});
            cv::morphologyEx(bin,bin,cv::MORPH_CLOSE,k,{-1,-1},1);
        }

        if(!paperMask.empty())
            cv::bitwise_and(bin, paperMask, bin);

        std::vector<std::vector<cv::Point>>ctrs;std::vector<cv::Vec4i>hier;
        cv::findContours(bin,ctrs,hier,cv::RETR_CCOMP,cv::CHAIN_APPROX_SIMPLE);

        float zoneFrac = sigZoneTop->value() / 100.0f;
        int zoneMinY   = int(bin.rows * zoneFrac);
        int maxAspect  = maxTextAspect->value();
        int minA       = minArea->value();

        cv::Mat clean=cv::Mat::zeros(bin.size(),CV_8U);
        for(int i=0;i<int(ctrs.size());i++){
            if(hier[i][3]!=-1)continue;
            double area=cv::contourArea(ctrs[i]);
            if(area<minA)continue;

            cv::Rect bbox=cv::boundingRect(ctrs[i]);
            int cy = bbox.y + bbox.height/2;
            if(cy < zoneMinY) continue;

            int bh = std::max(1, bbox.height);
            if(bbox.width / bh > maxAspect) continue;

            cv::drawContours(clean,ctrs,i,255,cv::FILLED);

            for(int j=0;j<int(ctrs.size());j++){
                if(hier[j][3]!=i)continue;
                if(cv::contourArea(ctrs[j])<minA*0.1)continue;
                cv::drawContours(clean,ctrs,j,0,cv::FILLED);
            }
        }
        return clean;
    }

    cv::Mat prepareSvgMask(const cv::Mat &mask) const {
        cv::Mat m=mask.clone();
        int dil=svgDilate->value();
        if(dil>0){
            int ks=dil*2+1;
            cv::Mat el=cv::getStructuringElement(cv::MORPH_ELLIPSE,{ks,ks});
            cv::dilate(m,m,el);
        }
        if(svgClose->isChecked()){
            cv::Mat k=cv::getStructuringElement(cv::MORPH_ELLIPSE,{3,3});
            cv::morphologyEx(m,m,cv::MORPH_CLOSE,k,{-1,-1},1);
        }
        return m;
    }

    // ── PNG overlay (preview at 2×) ─────────────────────────────────────────
    QPixmap pngOverlay(const cv::Mat &mask){
        int alpha=int(255*overlayOpacity->value()/100.0);
        QImage img=renderPNG(mask, 2, pngDilate->value(),
            pngBlur->value()*0.1f, pngSharpen->value()*0.1f, 1, 1.0, alpha);
        return QPixmap::fromImage(img);
    }

    // ── Vector overlay
    //  ★ Preview uses half the save upscale — rendering is O(US²), so this
    //    gives ~4× speedup for preview with minimal visual difference
    // ──────────────────────────────────────────────────────────────────────
    QPixmap vecOverlay(const cv::Mat &mask){
        cv::Mat m = prepareSvgMask(mask);
        m = straightenMask(m);

        int saveUS = svgUpScale->value();
        // Preview at half resolution (minimum 2)
        int prevUS = std::max(2, saveUS / 2);

        cv::Mat mUp;
        cv::resize(m,mUp,{m.cols*prevUS,m.rows*prevUS},0,0,cv::INTER_NEAREST);

        double eps  = penBezTol->value() * 0.1 * prevUS;
        int    minA = svgMinArea->value() * prevUS * prevUS;
        int    smR  = svgSmooth->value() * prevUS;

        QPainterPath fp=maskToPath(mUp,eps,minA,smR);

        QImage img(mUp.cols,mUp.rows,QImage::Format_ARGB32_Premultiplied);
        img.fill(Qt::transparent);
        {
            QPainter p(&img);
            p.setRenderHint(QPainter::Antialiasing);
            int alpha=int(255*overlayOpacity->value()/100.0);

            float outlineW=3.0f*prevUS;
            QPen whitePen(QColor(255,255,255,alpha),outlineW);
            whitePen.setJoinStyle(Qt::RoundJoin);
            whitePen.setCapStyle(Qt::RoundCap);
            p.setPen(whitePen);
            p.setBrush(Qt::NoBrush);
            p.drawPath(fp);

            p.setPen(Qt::NoPen);
            p.fillPath(fp,QColor(0,0,0,alpha));
        }
        QImage out=img.scaled(m.cols,m.rows,
                              Qt::IgnoreAspectRatio,Qt::SmoothTransformation);
        return QPixmap::fromImage(out);
    }

    void savePNG(){
        if(capturedMask.empty()) return;
        cv::Mat m = straightenMask(capturedMask);
        QImage img=renderPNG(m, 4, pngDilate->value(),
            pngBlur->value()*0.1f, pngSharpen->value()*0.1f,
            pngOutScale->value(), 1.0, 255);
        img.save("signature.png","PNG");
    }

    // ── SVG save (full quality: uses full upscale + CHAIN_APPROX_SIMPLE) ───
    void saveSVG(){
        if(capturedMask.empty()) return;
        cv::Mat m = prepareSvgMask(capturedMask);
        m = straightenMask(m);

        int US=svgUpScale->value();
        cv::Mat mUp;
        cv::resize(m,mUp,{m.cols*US,m.rows*US},0,0,cv::INTER_NEAREST);

        double eps  =penBezTol->value()*0.1*US;
        int    minA =svgMinArea->value()*US*US;
        int    smR  =svgSmooth->value()*US;
        float  inv  =1.f/float(US);
        int    srcW =m.cols, srcH=m.rows;

        std::vector<std::vector<cv::Point>>ctrs;
        std::vector<cv::Vec4i>hier;
        cv::findContours(mUp,ctrs,hier,cv::RETR_CCOMP,cv::CHAIN_APPROX_SIMPLE);

        QString svg;QTextStream out(&svg);
        out.setRealNumberPrecision(3);
        out.setRealNumberNotation(QTextStream::FixedNotation);
        out<<"<?xml version='1.0' encoding='UTF-8'?>\n";
        out<<"<svg xmlns='http://www.w3.org/2000/svg'"
           <<" width='"<<srcW<<"' height='"<<srcH<<"'"
           <<" viewBox='0 0 "<<srcW<<" "<<srcH<<"'>\n";
        out<<"<g transform='scale("<<inv<<")'"
           <<" fill='black' fill-rule='evenodd'>\n";

        for(int i=0;i<int(ctrs.size());i++){
            if(hier[i][3]!=-1)continue;
            if(cv::contourArea(ctrs[i])<minA)continue;
            QString d=contourToSVGPath(ctrs[i],eps,smR);
            if(d.isEmpty())continue;
            for(int j=0;j<int(ctrs.size());j++){
                if(hier[j][3]!=i)continue;
                if(cv::contourArea(ctrs[j])<minA*0.1)continue;
                QString hd=contourToSVGPath(ctrs[j],eps,smR);
                if(!hd.isEmpty()) d+=" "+hd;
            }
            out<<"<path d='"<<d<<"'/>\n";
        }
        out<<"</g>\n</svg>\n";

        QFile f("signature.svg");
        if(f.open(QIODevice::WriteOnly)) f.write(svg.toUtf8());
    }
private slots:
    void processFrame(const QVideoFrame&frame){
        if(frameTimer.elapsed() < 100) return;
        frameTimer.start();

        if(!frame.isValid())return;
        QImage img=frame.toImage().convertToFormat(QImage::Format_RGB888);
        cv::Mat full(img.height(),img.width(),CV_8UC3,
                     const_cast<uchar*>(img.bits()),img.bytesPerLine());
        QRect sr=cameraView->computeScanRect(cameraView->size(),img.size());
        cv::Rect cvSR(sr.x(),sr.y(),sr.width(),sr.height());
        if(cvSR.x<0||cvSR.y<0||cvSR.x+cvSR.width>full.cols||cvSR.y+cvSR.height>full.rows)return;
        cv::Mat roi=full(cvSR).clone();
        cv::Mat mask=detect(roi);

        bool shouldCapture=false;
        if(chkAuto->isChecked()){
            if(cv::countNonZero(mask)/double(mask.rows*mask.cols)>0.006)
                shouldCapture=true;
        }else{
            shouldCapture=true;
        }

        if(shouldCapture){
            capturedMask=mask.clone();
            Baseline raw=detectBaseline(capturedMask);
            updateBaseline(raw);
        }

        bool isVec=overlayMode->currentIndex()==1;
        QPixmap overlay;
        if(!capturedMask.empty())
            overlay=isVec?vecOverlay(capturedMask):pngOverlay(capturedMask);
        QPixmap dbg;
        if(!mask.empty()){
            cv::Mat d3;cv::cvtColor(mask,d3,cv::COLOR_GRAY2RGB);
            dbg=QPixmap::fromImage(QImage(d3.data,d3.cols,d3.rows,
                                           int(d3.step),QImage::Format_RGB888).copy());
        }
        QPixmap camPx=QPixmap::fromImage(img);
        cameraView->setFrame(camPx,overlay,sr,dbg,isVec);
    }
};

#include "signature_app.moc"

int main(int argc,char*argv[]){
    QApplication app(argc,argv);
    MainWindow w;w.resize(1200,820);w.show();
    return app.exec();
}