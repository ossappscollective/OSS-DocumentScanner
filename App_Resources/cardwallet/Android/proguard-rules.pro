-keep public class com.itextpdf.**
# prevents crash in fresco on android 7
-keep public class com.facebook.imageutils.** {
   public *;
}
# JS-implemented classes: native runtime sets their fields (runtimeId) by name, R8 must not strip them
-keep @com.tns.JavaScriptImplementation class * { *; }
