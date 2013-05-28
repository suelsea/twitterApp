#! /bin/sh

DIR=$(dirname $0)
if test x$1 != x; then
  FILE=$1/all.js
else
  FILE=$DIR/all.js
fi

cat $DIR/libs/phonegap*.js $DIR/libs/ChildBrowser.js $DIR/libs/phonegap-icloud.js > $FILE
for i in $(grep -o "[a-zA-z0-9./\-]*\.js" $DIR/../web.html)
do
  cat $DIR/../$i >> $FILE
done
