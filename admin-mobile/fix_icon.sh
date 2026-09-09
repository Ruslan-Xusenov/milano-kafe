#!/bin/bash
set -e

# Base foreground image, pad with white so logo fits in 66% safe zone
convert milano_foods_admin_icon.png -gravity center -background white -extent 1900x1900 fg_base.png

# Create mipmap sizes for foreground
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

convert fg_base.png -resize 108x108 android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
convert fg_base.png -resize 162x162 android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
convert fg_base.png -resize 216x216 android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
convert fg_base.png -resize 324x324 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
convert fg_base.png -resize 432x432 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png

# Create colors.xml
mkdir -p android/app/src/main/res/values
cat << 'XML' > android/app/src/main/res/values/colors.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
XML

# Create adaptive icon xml
mkdir -p android/app/src/main/res/mipmap-anydpi-v26
cat << 'XML' > android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML

cat << 'XML' > android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML

echo "Done"
