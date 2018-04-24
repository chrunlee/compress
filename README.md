# compress
压缩指定目录下的js或将压缩后的输入到某目录下，非触发式，需要主动调用

### usage 

```
npm install compressjs2 -g
compress //压缩当前目录下所有js并替换
compress -d /home/js //压缩目标目录下js并替换
compress -d /home/js -o /home/build //压缩目标目录下js并输出到/home/build目录下
compress -c //美化压缩后的js文件
```

### License
The MIT License