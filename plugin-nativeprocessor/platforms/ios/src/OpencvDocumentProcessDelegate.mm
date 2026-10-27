
#import "OpencvDocumentProcessDelegate.h"

#import <QuartzCore/QuartzCore.h>

#import <opencv2/opencv.hpp>
#import <DocumentDetector.h>
#import <DocumentOCR.h>
#ifdef WITH_QRCODE
#import <QRCode.h>
#endif
#import <Utils.h>

@implementation OpencvDocumentProcessDelegate

- (instancetype)initWithCropView:(NSCropView*) view{
  self.cropView = view;
  self.previewResizeThreshold = 300;
  self.autoScanHandler = nil;
  self.detectDocuments = true;
  self.detectQRCodeOptions = @"{\"resizeThreshold\":500}";
  self.detectQRCode = false;
  return [self init];
}
- (instancetype)initWithCropView:(NSCropView*) view onQRCode:(id<OnQRCode>)onQRCode {
  self.onQRCode = onQRCode;
  return [self initWithCropView:view];
}

- (NSObject*) autoScanHandler
{
  return self.innerAutoScanHandler;
}
//  Setters
- (void) setAutoScanHandler:(NSObject *)value
{
  if (value == nil || [value isKindOfClass:[AutoScanHandler class]]) {
    if(self.innerAutoScanHandler != nil) {
      self.innerAutoScanHandler.enabled = false;
    }
    if(self.cropView != nil) {
      self.cropView.drawFill = value == nil;
    }
    self.innerAutoScanHandler = (AutoScanHandler*)value;
  }
}

CGImageRef MatToCGImage(const cv::Mat& image) {
  NSData *data = [NSData dataWithBytes:image.data
                                length:image.step.p[0] * image.rows];
  
  CGColorSpaceRef colorSpace;
  
  if (image.elemSize() == 1) {
    colorSpace = CGColorSpaceCreateDeviceGray();
  } else {
    colorSpace = CGColorSpaceCreateDeviceRGB();
  }
  
  CGDataProviderRef provider =
  CGDataProviderCreateWithCFData((__bridge CFDataRef)data);
  
  // Preserve alpha transparency, if exists
  bool alpha = image.channels() == 4;
  uint32_t bitmapInfo = (uint32_t)(alpha ? kCGImageAlphaLast : kCGImageAlphaNone) | (uint32_t)kCGBitmapByteOrderDefault;
  
  // Creating CGImage from cv::Mat
  CGImageRef imageRef = CGImageCreate(image.cols,
                                      image.rows,
                                      8 * image.elemSize1(),
                                      8 * image.elemSize(),
                                      image.step.p[0],
                                      colorSpace,
                                      bitmapInfo,
                                      provider,
                                      NULL,
                                      false,
                                      kCGRenderingIntentDefault
                                      );
  
  CGDataProviderRelease(provider);
  CGColorSpaceRelease(colorSpace);
  
  return imageRef;
}

UIImage* MatToUIImage(const cv::Mat& image) {
  // Creating CGImage from cv::Mat
  CGImageRef imageRef = MatToCGImage(image);
  
  // Getting UIImage from CGImage
  UIImage *uiImage = [UIImage imageWithCGImage:imageRef];
  CGImageRelease(imageRef);
  
  return uiImage;
}

void UIImageToMat(const UIImage* image, cv::Mat& m) {
  CGImageRef imageRef = image.CGImage;
  CGImageToMat(imageRef, m, CGImageGetAlphaInfo( image.CGImage ) != kCGImageAlphaNone);
}

void CGImageToMat(const CGImageRef image, cv::Mat& m, bool alphaExist) {
  CGColorSpaceRef colorSpace = CGImageGetColorSpace(image);
  CGFloat cols = CGImageGetWidth(image), rows = CGImageGetHeight(image);
  CGContextRef contextRef;
uint32_t bitmapInfo = kCGImageAlphaPremultipliedLast;
  if (CGColorSpaceGetModel(colorSpace) == kCGColorSpaceModelMonochrome)
  {
    m.create(rows, cols, CV_8UC1); // 8 bits per component, 1 channel
    bitmapInfo = kCGImageAlphaNone;
    if (!alphaExist)
      bitmapInfo = kCGImageAlphaNone;
    else
      m = cv::Scalar(0);
    contextRef = CGBitmapContextCreate(m.data, m.cols, m.rows, 8,
                                       m.step[0], colorSpace,
                                       bitmapInfo);
  }
  else if (CGColorSpaceGetModel(colorSpace) == kCGColorSpaceModelIndexed)
  {
    // CGBitmapContextCreate() does not support indexed color spaces.
    colorSpace = CGColorSpaceCreateDeviceRGB();
    m.create(rows, cols, CV_8UC4); // 8 bits per component, 4 channels
    if (!alphaExist)
      bitmapInfo = (uint32_t)kCGImageAlphaNoneSkipLast |
      (uint32_t)kCGBitmapByteOrderDefault;
    else
      m = cv::Scalar(0);
    contextRef = CGBitmapContextCreate(m.data, m.cols, m.rows, 8,
                                       m.step[0], colorSpace,
                                       bitmapInfo);
    CGColorSpaceRelease(colorSpace);
  }
  else
  {
    m.create(rows, cols, CV_8UC4); // 8 bits per component, 4 channels
    if (!alphaExist)
      bitmapInfo = (uint32_t)kCGImageAlphaNoneSkipLast |
        (uint32_t)kCGBitmapByteOrderDefault;
    else
      m = cv::Scalar(0);
    contextRef = CGBitmapContextCreate(m.data, m.cols, m.rows, 8,
                                       m.step[0], colorSpace,
                                       bitmapInfo);
  }
  CGContextDrawImage(contextRef, CGRectMake(0, 0, cols, rows),
                     image);
  CGContextRelease(contextRef);
}
-(UIImage*) imageFromCIImage:(CIImage*)cmage {
  CIContext *context = [CIContext contextWithOptions:nil];
  CGImageRef cgImage = [context createCGImage:cmage fromRect:[cmage extent]];
  UIImage* uiImage = [UIImage imageWithCGImage:cgImage];
  CGImageRelease(cgImage);
  return uiImage;
}

- (cv::Mat)matFromBuffer:(CMSampleBufferRef)buffer {
  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(buffer);
  CIImage *ciImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
  UIImage* uiImage = [self imageFromCIImage:ciImage];
  cv::Mat image;
  CGImageAlphaInfo ainfo = CGImageGetAlphaInfo( uiImage.CGImage );
  CGImageToMat(uiImage.CGImage, image,  ainfo != kCGImageAlphaNone);
  return image;
}

- (cv::Mat) matFromImageBuffer: (CVImageBufferRef) buffer {
  cv::Mat mat ;
  CVPixelBufferLockBaseAddress(buffer, 0);
  void *address = CVPixelBufferGetBaseAddress(buffer);
  int width = (int) CVPixelBufferGetWidth(buffer);
  int height = (int) CVPixelBufferGetHeight(buffer);
  mat = cv::Mat(height, width, CV_8UC4, address, CVPixelBufferGetBytesPerRow(buffer));
  CVPixelBufferUnlockBaseAddress(buffer, 0);
  return mat;
}

- (cv::Mat)matFromSampleBuffer:(CMSampleBufferRef)sampleBuffer {
  CVImageBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  CVPixelBufferLockBaseAddress(imageBuffer, 0);
  
  void* bufferAddress;
  size_t width;
  size_t height;
  size_t bytesPerRow;
  
  int format_opencv;
  
  OSType format = CVPixelBufferGetPixelFormatType(imageBuffer);
  if (format == kCVPixelFormatType_420YpCbCr8BiPlanarFullRange) {
    
    format_opencv = CV_8UC1;
    
    bufferAddress = CVPixelBufferGetBaseAddressOfPlane(imageBuffer, 0);
    width = CVPixelBufferGetWidthOfPlane(imageBuffer, 0);
    height = CVPixelBufferGetHeightOfPlane(imageBuffer, 0);
    bytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(imageBuffer, 0);
    
  } else { // expect kCVPixelFormatType_32BGRA
    
    format_opencv = CV_8UC4;
    
    bufferAddress = CVPixelBufferGetBaseAddress(imageBuffer);
    width = CVPixelBufferGetWidth(imageBuffer);
    height = CVPixelBufferGetHeight(imageBuffer);
    bytesPerRow = CVPixelBufferGetBytesPerRow(imageBuffer);
    
  }
  
  // delegate image processing to the delegate
  cv::Mat image((int)height, (int)width, format_opencv, bufferAddress, bytesPerRow);
  
  CVPixelBufferUnlockBaseAddress(imageBuffer, 0);
  return image;
}

+(NSArray*)findDocumentCornersInMat:(cv::Mat)mat  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation scale:(CGFloat)scale options:(NSString*)options {
  detector::DocumentDetector docDetector(mat, shrunkImageHeight, (int)imageRotation, (double)scale);
  if (options != nil) {
    docDetector.updateOptions(std::string([options UTF8String]));
  }
  std::vector<std::vector<cv::Point>> scanPointsList = docDetector.scanPoint();
  unsigned long count = scanPointsList.size();
  if (count > 0) {
    NSMutableArray* objcScanPointsList = [[NSMutableArray alloc] initWithCapacity:count];
    for (int i = 0; i < count; i++) {
      std::vector<cv::Point> quad = scanPointsList[i];
      NSMutableArray* objcQuad =[[NSMutableArray alloc] initWithCapacity:quad.size()];
      for (int j = 0; j < quad.size(); j++) {
        [objcQuad addObject:[NSValue valueWithCGPoint:CGPointMake(quad[j].x, quad[j].y)]];
      }
      [objcScanPointsList addObject:objcQuad];
    }
    return objcScanPointsList;
  } else {
    return nil;
  }
}
+(NSArray*)findDocumentCorners:(UIImage*)image  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation scale:(CGFloat)scale options:(NSString*)options {
  cv::Mat mat;
  UIImageToMat(image, mat);
  return [self findDocumentCornersInMat:mat shrunkImageHeight:shrunkImageHeight imageRotation:imageRotation scale:scale options:options];
}

// PRAGMA: getJSONDocumentCorners
+(void) getJSONDocumentCornersSync:(UIImage*)image  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation delegate:(id<CompletionDelegate>)delegate scale:(CGFloat)scale options:(NSString*)options
{
  @try {
    NSArray* quads = [OpencvDocumentProcessDelegate findDocumentCorners:image shrunkImageHeight:shrunkImageHeight imageRotation:imageRotation scale:scale options:options];
    NSMutableArray* result = [NSMutableArray arrayWithCapacity:[quads count]];
    [quads enumerateObjectsUsingBlock:^(NSArray*  _Nonnull quad, NSUInteger idx, BOOL * _Nonnull stop) {
      // sort by Y
      NSArray* sortedQuadsY = [quad sortedArrayUsingComparator:^NSComparisonResult(NSValue*  _Nonnull obj1, NSValue*  _Nonnull obj2) {
        CGFloat y1 = [obj1 CGPointValue].y;
        CGFloat y2 = [obj2 CGPointValue].y;
        if (y1 > y2) {
          return (NSComparisonResult)NSOrderedDescending;
        } else if (y1 < y2) {
          return (NSComparisonResult)NSOrderedAscending;
        }
        return (NSComparisonResult)NSOrderedSame;
      }];
      // split by chunk of 2
      // sort by X
      NSArray* chunk1 =[[sortedQuadsY subarrayWithRange:NSMakeRange(0, 2)] sortedArrayUsingComparator:^NSComparisonResult(NSValue*  _Nonnull obj1, NSValue*  _Nonnull obj2) {
        CGFloat x1 = [obj1 CGPointValue].x;
        CGFloat x2 = [obj2 CGPointValue].x;
        if (x1 > x2) {
          return (NSComparisonResult)NSOrderedDescending;
        } else if (x1 < x2) {
          return (NSComparisonResult)NSOrderedAscending;
        }
        return (NSComparisonResult)NSOrderedSame;
      }];
      // sort by reversed X
      NSArray* chunk2 = [[sortedQuadsY subarrayWithRange:NSMakeRange(2, 2)] sortedArrayUsingComparator:^NSComparisonResult(NSValue*  _Nonnull obj1, NSValue*  _Nonnull obj2) {
        CGFloat x1 = [obj2 CGPointValue].x;
        CGFloat x2 = [obj1 CGPointValue].x;
        if (x1 > x2) {
          return (NSComparisonResult)NSOrderedDescending;
        } else if (x1 < x2) {
          return (NSComparisonResult)NSOrderedAscending;
        }
        return (NSComparisonResult)NSOrderedSame;
      }];
      NSMutableArray* result2 = [NSMutableArray arrayWithCapacity:[quads count]];
      [chunk1 enumerateObjectsUsingBlock:^(NSValue*  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        [result2 addObject:[NSString stringWithFormat:@"[%f,%f]",[obj CGPointValue].x, [obj CGPointValue].y ]];
      }];
      [chunk2 enumerateObjectsUsingBlock:^(NSValue*  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        [result2 addObject:[NSString stringWithFormat:@"[%f,%f]",[obj CGPointValue].x, [obj CGPointValue].y ]];
      }];
      [result addObject:[NSString stringWithFormat:@"[%@]", [result2 componentsJoinedByString:@","]]];
    }];
    NSString* stringResult = [NSString stringWithFormat:@"[%@]", [result componentsJoinedByString:@","]];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:stringResult error:nil];
      
    });
  }
  @catch (NSException *exception) {
    NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
    
    [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
    [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
    NSError* err = [NSError errorWithDomain:@"DetectError" code:-10 userInfo:info];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:nil error:err];
      
    });
  }
}
+(void) getJSONDocumentCorners:(UIImage*)image  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation delegate:(id<CompletionDelegate>)delegate
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    [self getJSONDocumentCornersSync:image shrunkImageHeight:shrunkImageHeight imageRotation:imageRotation delegate:delegate scale:1.0 options:nil];
  });
}
+(void) getJSONDocumentCornersFromFile:(NSString*)src  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation delegate:(id<CompletionDelegate>)delegate options:(NSString*)options
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    UIImage* image = [ImageUtils readImageFromFileSync:src :options];
    [self getJSONDocumentCornersSync:image shrunkImageHeight:shrunkImageHeight imageRotation:imageRotation delegate:delegate scale:1.0 options:options];
  });
}
+(void) getJSONDocumentCornersFromFile:(NSString*)src  shrunkImageHeight:(CGFloat)shrunkImageHeight imageRotation:(NSInteger)imageRotation delegate:(id<CompletionDelegate>)delegate
{
  [self getJSONDocumentCornersFromFile:src shrunkImageHeight:shrunkImageHeight imageRotation:imageRotation delegate:delegate options:nil];
}
+(void) getJSONDocumentCornersFromFile:(NSString*)src delegate:(id<CompletionDelegate>)delegate options:(NSString*)optionsStr
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSDictionary* options = [ImageUtils toJSON:optionsStr];
    NSDictionary* imageSize = [ImageUtils getImageSize: src];
    NSNumber* imageRotation = [options objectForKey:@"imageRotation"] ?: @(0);
    UIImage* image = [ImageUtils readImageFromFileSync:src options:options];
    CGFloat scale = 1.0;
    if ([[imageSize objectForKey:@"rotation"] intValue] % 180 != 0) {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.height;
    } else {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.width;
    }
    [self getJSONDocumentCornersSync:image shrunkImageHeight:0 imageRotation:[imageRotation intValue] delegate:delegate scale:scale options:optionsStr];
  });
}

// PRAGMA: cropDocument
+(void) cropDocumentSync:(UIImage*)image quads:(NSString*)quads delegate:(id<CompletionDelegate>)delegate  transforms:(NSString*)transforms saveInFolder:(NSString*)saveInFolder fileName:(NSString*)fileName compressFormat:(NSString*)compressFormat compressQuality:(CGFloat)compressQuality   {
  @try {
    //    CFTimeInterval startTime = CACurrentMediaTime();
    NSError *error = nil;
    NSArray* quadsArray = [NSJSONSerialization JSONObjectWithData:[quads dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&error];
    NSMutableArray* images = [NSMutableArray array];
    NSMutableArray* jsonResult = [NSMutableArray array];
    //  std::vector<std::vector<cv::Point>> scanPointsList;
    cv::Mat srcBitmapMat;
    UIImageToMat(image, srcBitmapMat);
    
    NSUInteger index = 0;
    for (NSArray* quad in quadsArray) {
      std::vector<cv::Point> points;
      for (NSArray* point in quad) {
        cv::Point cvpoint([[point objectAtIndex:0] intValue], [[point objectAtIndex:1] intValue]);
        points.push_back(cvpoint);
      };
      cv::Point leftTop = points[0];
      cv::Point  rightTop = points[1];
      cv::Point rightBottom = points[2];
      cv::Point  leftBottom = points[3];
      int newWidth = (cv::norm(leftTop-rightTop) + cv::norm(leftBottom-rightBottom)) / 2.0f;
      int newHeight = (cv::norm(leftTop-leftBottom) + cv::norm(rightTop-rightBottom)) / 2.0f;
      
      Mat dstBitmapMat;
      dstBitmapMat = Mat::zeros(newHeight, newWidth, srcBitmapMat.type());
      
      std::vector<Point2f> srcTriangle;
      std::vector<Point2f> dstTriangle;
      
      srcTriangle.push_back(Point2f(leftTop.x, leftTop.y));
      srcTriangle.push_back(Point2f(rightTop.x, rightTop.y));
      srcTriangle.push_back(Point2f(leftBottom.x, leftBottom.y));
      srcTriangle.push_back(Point2f(rightBottom.x, rightBottom.y));
      
      dstTriangle.push_back(Point2f(0, 0));
      dstTriangle.push_back(Point2f(newWidth, 0));
      dstTriangle.push_back(Point2f(0, newHeight));
      dstTriangle.push_back(Point2f(newWidth, newHeight));
      
      Mat transform = getPerspectiveTransform(srcTriangle, dstTriangle);
      cv::warpPerspective(srcBitmapMat, dstBitmapMat, transform, dstBitmapMat.size());
      if (transforms != nil && ![transforms isEqual:[NSNull null]]) {
        std::string transformsStd = std::string([transforms UTF8String]);
        if (transformsStd.length() > 0)
        {
          detector::DocumentDetector::applyTransforms(dstBitmapMat, transformsStd);
        }
      }
      if (saveInFolder != nil && ![saveInFolder isEqual:[NSNull null]]) {
        
          NSString* imagePath = [NSString stringWithFormat:@"%@/%@", saveInFolder, fileName ?: [NSString stringWithFormat:@"cropedBitmap_%lu.%@", static_cast<unsigned long>(index), compressFormat]];
        if ([compressFormat isEqualToString:@"jpg"]) {
          NSError *error = nil;
          //          std::vector<int> compression_params;
          //          compression_params.push_back(IMWRITE_JPEG_QUALITY);
          //          compression_params.push_back(compressQuality);
          //          cv::imwrite([imagePath UTF8String], dstBitmapMat);
          [UIImageJPEGRepresentation(MatToUIImage(dstBitmapMat), compressQuality/ 100.0) writeToFile:imagePath options:NSDataWritingAtomic error:&error];
        } else {
          [UIImagePNGRepresentation(MatToUIImage(dstBitmapMat)) writeToFile:imagePath options:NSDataWritingAtomic error:&error];
        }
        if(error != nil) {
          [delegate onComplete:nil error:error];
          return;
        }
        [jsonResult addObject:[NSString stringWithFormat:@"{\"imagePath\":\"%@\",\"width\":%@,\"height\":%@}", imagePath, @(newWidth), @(newHeight)]];
        
      } else {
        [images addObject:MatToUIImage(dstBitmapMat)];
      }
      index++;
    };
    //    NSLog(@"cropDocumentSync %f ms", (CACurrentMediaTime() - startTime)*1000.0);
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      if ([images count] > 0) {
        [delegate onComplete:images error:nil];
      } else {
        NSString* result = [NSString stringWithFormat:@"[%@]", [jsonResult componentsJoinedByString:@","]];
        [delegate onComplete:result error:nil];
        
      }
      
    });
  }
  @catch (NSException *exception) {
    NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
    
    [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
    [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
    NSError* err = [NSError errorWithDomain:@"CropError" code:-10 userInfo:info];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:nil error:err];
      
    });
  }
}
+(void) cropDocumentSync:(UIImage*)image quads:(NSString*)quads delegate:(id<CompletionDelegate>)delegate  transforms:(NSString*)transforms saveInFolder:(NSString*)saveInFolder fileName:(NSString*)fileName compressFormat:(NSString*)compressFormat   {
  [self cropDocumentSync:image quads:quads delegate:delegate transforms:transforms saveInFolder:saveInFolder fileName:fileName compressFormat:compressFormat compressQuality:100];
}
+(void) cropDocumentSync:(UIImage*)image quads:(NSString*)quads delegate:(id<CompletionDelegate>)delegate  transforms:(NSString*)transforms saveInFolder:(NSString*)saveInFolder fileName:(NSString*)fileName   {
  [self cropDocumentSync:image quads:quads delegate:delegate transforms:transforms saveInFolder:saveInFolder fileName:fileName compressFormat:@"jpg"];
}
+(void) cropDocumentSync:(UIImage*)image quads:(NSString*)quads delegate:(id<CompletionDelegate>)delegate  transforms:(NSString*)transforms   {
  [self cropDocumentSync:image quads:quads delegate:delegate transforms:transforms saveInFolder:nil fileName:nil];
}

// PRAGMA: cropDocumentFromFile
+(void) cropDocumentFromFile:(NSString*) src quads:(NSString*)quads delegate:(id<CompletionDelegate>)delegate options:(NSString*)optionsStr {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSDictionary* options = [ImageUtils toJSON:optionsStr];
    UIImage* image = [ImageUtils readImageFromFileSync:src options:options];
    NSNumber* compressQuality = [options objectForKey:@"compressQuality"] ?: @(100);
    [self cropDocumentSync:image quads:quads delegate:delegate transforms:([options objectForKey:@"transforms"] ?: @"") saveInFolder:[options objectForKey:@"saveInFolder"] fileName:[options objectForKey:@"fileName"] compressFormat:([options objectForKey:@"compressFormat"] ?: @"jpg") compressQuality:[compressQuality floatValue] ];
  });
}

+(void) cropDocumentFromFile:(NSString*) src quads:(NSString*)quads  delegate:(id<CompletionDelegate>)delegate {
  
  [self cropDocumentFromFile:src quads:quads delegate:delegate options:nil];
}


// PRAGMA: cropDocument
+(void) cropDocument:(UIImage*) image quads:(NSString*)quads  delegate:(id<CompletionDelegate>)delegate transforms:(NSString*)transforms{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    [self cropDocumentSync:image quads:quads delegate:delegate transforms:transforms];
  });
}
+(void) cropDocument:(UIImage*) image quads:(NSString*)quads  delegate:(id<CompletionDelegate>)delegate {
  [self cropDocument:image quads:quads delegate:delegate transforms:nil];
}


// PRAGMA: ocrDocument
+(void)ocrDocumentSync:(UIImage*)image options:(NSString*)options delegate:(id<CompletionDelegate>)delegate {
  @try {
    cv::Mat srcBitmapMat;
    UIImageToMat(image, srcBitmapMat);
    std::optional<std::function<void(int)>> progressLambda = [&](int progress)
    {
      [delegate onProgress:progress];
    };
    
    std::string result = detector::DocumentOCR::detectText(srcBitmapMat, std::string([options UTF8String]), progressLambda);
    
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:[NSString stringWithUTF8String:result.c_str()] error:nil];
      
    });
  }
  @catch (NSException *exception) {
    NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
    
    [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
    [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
    NSError* err = [NSError errorWithDomain:@"OCRError" code:-10 userInfo:info];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:nil error:err];
      
    });
  }
}

+(void)ocrDocument:(UIImage*)image options:(NSString*)options delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    [self ocrDocumentSync:image options:options delegate:delegate];
  });
}
+(void)ocrDocumentFromFile:(NSString*)src options:(NSString*)options delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    UIImage* image = [ImageUtils readImageFromFileSync:src :options];
    [self ocrDocumentSync:image options:options delegate:delegate];
  });
}

#ifdef WITH_QRCODE

// PRAGMA: detectQRCode
+(void)detectQRCodeSync:(UIImage*)image options:(NSString*)options delegate:(id<CompletionDelegate>)delegate scale:(CGFloat)scale {
  @try {
    cv::Mat srcBitmapMat;
    UIImageToMat(image, srcBitmapMat);
    std::string result = readQRCode(srcBitmapMat, 0, std::string([options UTF8String]), scale);
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:[NSString stringWithUTF8String:result.c_str()] error:nil];
      
    });
  }
  @catch (NSException *exception) {
    NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
    
    [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
    [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
    NSError* err = [NSError errorWithDomain:@"OCRError" code:-10 userInfo:info];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:nil error:err];
      
    });
  }
}

+(void)detectQRCode:(UIImage*)image options:(NSString*)options delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    [self detectQRCodeSync:image options:options delegate:delegate scale:1.0];
  });
}
+(void)detectQRCodeFromFile:(NSString*)src options:(NSString*)optionsStr delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSDictionary* options = [ImageUtils toJSON:optionsStr];
    NSDictionary* imageSize = [ImageUtils getImageSize: src];
//    NSNumber* imageRotation = [options objectForKey:@"imageRotation"] ?: @(0);
    UIImage* image = [ImageUtils readImageFromFileSync:src options:options];
    CGFloat scale = 1.0;
    if ([[imageSize objectForKey:@"rotation"] intValue] % 180 != 0) {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.height;
    } else {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.width;
    }
    [self detectQRCodeSync:image options:optionsStr delegate:delegate scale:scale];
  });
}

// PRAGMA: generateQRCode
+( UIImage*)generateQRCodeSync:(NSString*)text format:(NSString*)format  width:(NSInteger)width height:(NSInteger)height  options:(NSString*)options {
  cv::Mat result = generateQRCode(std::string([text UTF8String]), std::string([format UTF8String]), (int)width, (int)height, std::string([options UTF8String]));
  return MatToUIImage(result);
}

+(void)generateQRCode:(NSString*)text format:(NSString*)fromat  width:(NSInteger)width height:(NSInteger)height  options:(NSString*)options delegate:(id<CompletionDelegate>)delegate
{

  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    @try {
      UIImage* result = [self generateQRCodeSync:text format:fromat  width:width height:height  options:options];
      dispatch_async(dispatch_get_main_queue(), ^(void) {
        [delegate onComplete:result error:nil];
      });
    }
    @catch (NSException *exception) {
      NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
      
      [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
      [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
      NSError* err = [NSError errorWithDomain:@"OCRError" code:-10 userInfo:info];
      dispatch_async(dispatch_get_main_queue(), ^(void) {
        [delegate onComplete:nil error:err];
        
      });
    }
  });
}

// PRAGMA: generateQRCode
+(NSString*)generateQRCodeSVGSync:(NSString*)text format:(NSString*)format  sizeHint:(NSInteger)sizeHint  options:(NSString*)options {
  std::string result = generateQRCodeSVG(std::string([text UTF8String]), std::string([format UTF8String]), (int)sizeHint, std::string([options UTF8String]));
  return [NSString stringWithUTF8String:result.c_str()];
}

+(void)generateQRCodeSVG:(NSString*)text format:(NSString*)fromat  sizeHint:(NSInteger)sizeHint  options:(NSString*)options delegate:(id<CompletionDelegate>)delegate
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    @try {
       NSString* result = [self generateQRCodeSVGSync:text format:fromat  sizeHint:sizeHint  options:options];
        dispatch_async(dispatch_get_main_queue(), ^(void) {
          [delegate onComplete:result error:nil];
        });
      }
      @catch (NSException *exception) {
        NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
        
        [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
        [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
        NSError* err = [NSError errorWithDomain:@"OCRError" code:-10 userInfo:info];
        dispatch_async(dispatch_get_main_queue(), ^(void) {
          [delegate onComplete:nil error:err];
          
        });
      }
  });
}
#endif

// PRAGMA: process
+(void)processSync:(UIImage*)image processes:(NSString*)processes options:(NSString*)optionsStr delegate:(id<CompletionDelegate>)delegate scale:(CGFloat)scale {
  @try {
    cv::Mat srcBitmapMat;
    UIImageToMat(image, srcBitmapMat);
    NSDictionary* options = [ImageUtils toJSON:optionsStr];
    CGFloat shrunkImageHeight = (scale != 1.0) ? 0 : 500;
    
    NSError *error = nil;
    NSArray* processesJSON = (NSArray*)[NSJSONSerialization JSONObjectWithData:[processes dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&error];
    if (error) {
      throw error;
    } else {
      NSMutableArray* result = [[NSMutableArray alloc] init];
      for (NSDictionary* process in processesJSON)
      {
        NSString* type = [process objectForKey:@"type"];
        if ([type isEqualToString:@"qrcode"]) {
#ifdef WITH_QRCODE
          NSData *jsonData = [NSJSONSerialization dataWithJSONObject:process
                                                             options:0
                                                               error:&error];
          NSString* str = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
          std::string processOptions = std::string([str UTF8String]);
          std::string qrcode = readQRCode(srcBitmapMat, 0, processOptions, scale);
          [result addObject:[NSString stringWithUTF8String:qrcode.c_str()]];
#endif
          
        } else if ([type isEqualToString:@"palette"]) {
          std::string colors = getPaletteString(srcBitmapMat, true,
                                                [([options objectForKey:@"shrunkImageHeight"] ?: @(shrunkImageHeight)) intValue],
                                                [([options objectForKey:@"colorsFilterDistanceThreshold"] ?: @(20)) intValue],
                                                [([options objectForKey:@"nbColors"] ?: @(5)) intValue],
                                                true,
                                                (ColorSpace)[([options objectForKey:@"colorPalette"] ?: @(2)) intValue]);
          [result addObject:[NSString stringWithUTF8String:colors.c_str()]];
        }
      }
      dispatch_async(dispatch_get_main_queue(), ^(void) {
        [delegate onComplete:[NSString stringWithFormat:@"[%@]" , [result componentsJoinedByString:@","]] error:nil];
      });
    }
    // UIImageToMat(image, srcBitmapMat);
    // std::string result = readQRCode(srcBitmapMat, 0, std::string([options UTF8String]));
    // dispatch_async(dispatch_get_main_queue(), ^(void) {
    //   [delegate onComplete:[NSString stringWithUTF8String:result.c_str()] error:nil];
    
    // });
  }
  @catch (NSException *exception) {
    NSMutableDictionary *info = [exception.userInfo mutableCopy]?:[[NSMutableDictionary alloc] init];
    [info addEntriesFromDictionary: [exception dictionaryWithValuesForKeys:@[@"ExceptionName", @"ExceptionReason", @"ExceptionCallStackReturnAddresses", @"ExceptionCallStackSymbols"]]];
    [info addEntriesFromDictionary:@{NSLocalizedDescriptionKey: exception.name, NSLocalizedFailureReasonErrorKey:exception.reason }];
    NSError* err = [NSError errorWithDomain:@"ProcessError" code:-10 userInfo:info];
    dispatch_async(dispatch_get_main_queue(), ^(void) {
      [delegate onComplete:nil error:err];
      
    });
  }
}

+(void)process:(UIImage*)image processes:(NSString*)processes options:(NSString*)options delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    [self processSync:image processes:processes options:options delegate:delegate scale:1.0];
  });
}
+(void)processFromFile:(NSString*)src processes:(NSString*)processes options:(NSString*)optionsStr delegate:(id<CompletionDelegate>)delegate {
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSDictionary* options = [ImageUtils toJSON:optionsStr];
    NSDictionary* imageSize = [ImageUtils getImageSize: src];
//    NSNumber* imageRotation = [options objectForKey:@"imageRotation"] ?: @(0);
    UIImage* image = [ImageUtils readImageFromFileSync:src options:options];
    CGFloat scale = 1.0;
    if ([[imageSize objectForKey:@"rotation"] intValue] % 180 != 0) {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.height;
    } else {
      scale = [[imageSize objectForKey:@"width"] floatValue] / image.size.width;
    }
    [self processSync:image processes:processes options:optionsStr delegate:delegate scale:scale];
  });
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer cameraView:(NSCameraView *)cameraView
{
  // reading codes only needs the luma plane: wrap it instead of converting the whole frame (~25ms)
  CVImageBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  const OSType pixelFormat = CVPixelBufferGetPixelFormatType(imageBuffer);
  const BOOL lumaOnly = self.detectQRCode && !self.detectDocuments && CVPixelBufferIsPlanar(imageBuffer) &&
    (pixelFormat == kCVPixelFormatType_420YpCbCr8BiPlanarFullRange || pixelFormat == kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange);
  cv::Mat mat;
  if (lumaOnly) {
    CVPixelBufferLockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);
    mat = cv::Mat((int)CVPixelBufferGetHeightOfPlane(imageBuffer, 0), (int)CVPixelBufferGetWidthOfPlane(imageBuffer, 0), CV_8UC1, CVPixelBufferGetBaseAddressOfPlane(imageBuffer, 0), CVPixelBufferGetBytesPerRowOfPlane(imageBuffer, 0));
  } else {
    mat = [self matFromBuffer:sampleBuffer];
  }
  // readQRCode can shrink mat in place, while its positions are in the original frame
  const CGSize frameSize = CGSizeMake(mat.cols, mat.rows);
//  int videoOrientation =  (int)cameraView.videoOrientation;
  UIDeviceOrientation orientation = [[UIDevice currentDevice] orientation];
  int rotation = 0;
  switch (orientation) {
    case UIDeviceOrientationPortraitUpsideDown:
      rotation = 180;
      break;
    case UIDeviceOrientationLandscapeLeft:
      rotation = 90;
      break;
    case UIDeviceOrientationLandscapeRight:
      rotation = -90;
      break;
    default:
      break;
  }
  
  NSMutableArray* points = [[NSMutableArray alloc] init];
  if (self.detectDocuments) {
    NSArray* result = [OpencvDocumentProcessDelegate findDocumentCornersInMat:mat shrunkImageHeight:self.previewResizeThreshold imageRotation:0 scale:1.0 options:nil];
    if (result != nil) {
      [points addObjectsFromArray:result];
    }
    if (self.innerAutoScanHandler != nil) {
      [((AutoScanHandler*)self.innerAutoScanHandler) processWithPoints: points];
    }
  }
#ifdef WITH_QRCODE
  if (self.detectQRCode) {
    std::string qrcodeResult = readQRCode(mat, 0, std::string([self.detectQRCodeOptions UTF8String]), 1.0);
    BOOL qrCodeFound = NO;
    if (qrcodeResult.length() > 0) {
      NSString* nsResult = [NSString stringWithUTF8String:qrcodeResult.c_str()];
      NSError *error = nil;
      id qrcodeArray = [NSJSONSerialization JSONObjectWithData:[nsResult dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&error];
      if (error || ![qrcodeArray isKindOfClass:[NSArray class]] || [(NSArray*)qrcodeArray count] == 0) {
        // Handle error, or no code in this frame ("[]")
      } else {
        NSDictionary* qrcode = [((NSArray*)qrcodeArray) objectAtIndex:0];
        // the crop view draws quads made of CGPoint NSValues, not of [x, y] pairs
        NSArray* position = [qrcode objectForKey:@"position"];
        NSMutableArray* quad = [[NSMutableArray alloc] initWithCapacity:[position count]];
        for (NSArray* corner in position) {
          [quad addObject:[NSValue valueWithCGPoint:CGPointMake([corner[0] doubleValue], [corner[1] doubleValue])]];
        }
        [points addObject:quad];
        qrCodeFound = YES;
        // the callback runs JS and closes the scanner: not on the camera queue,
        // and only once per code, not for every frame it stays visible
        if (self.onQRCode && !self.qrCodeDelivered) {
          self.qrCodeDelivered = YES;
          id<OnQRCode> onQRCode = self.onQRCode;
          dispatch_async(dispatch_get_main_queue(), ^{
            [onQRCode onQRCodes:nsResult];
          });
        }
      }
    }
    if (!qrCodeFound) {
      self.qrCodeDelivered = NO;
    }
    
  }
#endif
  self.cropView.videoGravity = cameraView.videoGravity;
  self.cropView.imageSize = frameSize;
  self.cropView.quads = points;
  
  mat.release();
  if (lumaOnly) {
    CVPixelBufferUnlockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);
  }
}
// This is called on the camera session queue, which also runs the session changes (camera toggle, torch...).
// Processing frames there starves those changes when it is slower than the camera, so process on our own queue
// and skip the frames received while it is busy.
- (void)cameraView:(NSCameraView *)cameraView willProcessRawVideoSampleBuffer:(CMSampleBufferRef)sampleBuffer onQueue:(dispatch_queue_t)queue
{
  static dispatch_queue_t processingQueue;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    processingQueue = dispatch_queue_create("com.akylas.documentscanner.frameprocessing", DISPATCH_QUEUE_SERIAL);
  });
  if (self.processingFrame) {
    return;
  }
  self.processingFrame = YES;
  CFRetain(sampleBuffer);
  dispatch_async(processingQueue, ^{
    [self processSampleBuffer:sampleBuffer cameraView:cameraView];
    CFRelease(sampleBuffer);
    self.processingFrame = NO;
  });
}
- (void)cameraView:(NSCameraView *)cameraView renderToCustomContextWithImageBuffer:(CVPixelBufferRef)imageBuffer onQueue:(dispatch_queue_t)queue {
  // we do nothing here
}
@end
