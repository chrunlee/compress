//压缩指定目录下的js文件，或指定目录输出，或指定目录不压缩，或指定压缩配置项目（可控）
/***
 1. 指定目录进行压缩
 2. 可以指定哪些目录不进行压缩
 3. 可以指定输出目录，输出只要压缩的？ 还是全部？ 
 4. 压缩还是美化
 5. 署名--header
 6. 时间--压缩时间 footer
 7. 当前等级还是递归
 8. 是否混淆
 9. 记录压缩前大小，压缩后大小，压缩比率
 10.记录总共压缩的大小，压缩后大小，压缩比率
***/
var fs = require('fs'),
	path = require('path'),
	Uglify = require('uglify-js'),
	colors = require('colors'),
	async = require('async');


var Compress = function(directory,opts){
	this.filesize = {
		total : 0,//原大小
		compress : 0//处理后大小
	};//存储的文件信息
	this.fileList = [];//需要处理的文件
	this.directory = directory;//目标目录
	this.opts = Object.assign({
		//默认参数
		output : directory,//覆盖
		exclude : '',//排除
		minify : true,//压缩
		header : false,//无
		footer : true,//输出时间
		deepth : true,//递归
		mangle : true//混淆
	},opts);
	return this;
}
//格式化
Compress.prototype.formatSize = function(size, pointLength, units){
	var unit;
    units = units || [ 'B', 'KB', 'M', 'G', 'TB' ];

    while ( (unit = units.shift()) && size > 1024 ) {
        size = size / 1024;
    }
    return (unit === 'B' ? size : size.toFixed( pointLength || 2 )) + unit;
}
//递归创建目录
Compress.prototype.mkdir = function( dirpath ){
	dirpath = path.dirname(dirpath);
	 try{
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            dirpath.split(/[/\\]/).forEach(function (dirname) {  //这里指用/ 或\ 都可以分隔目录  如  linux的/usr/local/services   和windows的 d:\temp\aaaa
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    if (!fs.mkdirSync(pathtmp, 0777)) {
                        return false;
                    }
                }
            });
        }
        return true; 
    }catch(e){
    	console.log('文件夹目录创建失败:'+dirpath+'\n'+e.toString());
        return false;
    }
}
//启动
Compress.prototype.start = function(){
	var thiz = this;
	thiz.findFile(thiz.directory);
	async.mapLimit(thiz.fileList,10,function(item,cb){
		thiz.parser(item,cb);
	},function(err,values){
		//压缩完毕
		var error = 0,suc = 0;
		for(var i=0,max=values.length;i<max;i++){
			var obj = values[i];
			if(obj.suc){
				suc ++ ;
			}else{
				error ++;
			}
		}
		console.log('压缩完毕:'.yellow);
		console.log('    共计压缩文件:'.yellow+(''+values.length).green+'个'.yellow);
		console.log('    成功压缩'.yellow+(''+suc).green+',压缩失败:'.yellow+(''+error).green+'个'.yellow);
		console.log('    压缩比率: '.yellow+(''+thiz.formatSize(thiz.filesize.total)+' --> '+thiz.formatSize(thiz.filesize.compress)).green);
	});
};
Compress.prototype.getNowDate = function(){
	var d = new Date();
	var year= d.getFullYear(),
		month = d.getMonth(),
		day = d.getDate(),
		hour = d.getHours(),
		minite = d.getMinutes();
	return year+'-'+month+'-'+day+' '+hour+':'+minite;
};
//对js进行压缩
Compress.prototype.parser = function(filePath,cb){
	var thiz = this;
	var opts = this.opts;
	var stats = fs.statSync(filePath);
	var fileSize = stats.size;
	fs.readFile(filePath,function(err,content){
		var baseCode = content.toString();
		var code = Uglify.minify(baseCode,{
			compress : opts.minify,
			mangle : opts.mangle,
			output : {
				beautify : !opts.minify
			}
		}).code;
		if(opts.header){
			code = '/***\n * '+opts.header+'\n ****/\n'+code;
		}
		code = code + '\n/*** @created by compressjs on '+thiz.getNowDate()+' ***/';
		//输出
		var newFilePath = path.join(opts.output,filePath.replace(path.join(thiz.directory),''));
		//循环创建
		thiz.mkdir(newFilePath);
		fs.writeFile(newFilePath,code,function(err){
			if(err){
				cb(null,{suc : false});
			}else{
				stats = fs.statSync(newFilePath);
				var miniSize = stats.size;
				thiz.filesize.total += fileSize;
				thiz.filesize.compress += miniSize;
				console.log('压缩'.yellow+(''+newFilePath).green+',压缩前'.yellow+(''+thiz.formatSize(fileSize)).green+',压缩后:'.yellow+(''+thiz.formatSize(miniSize)).green);
				cb(null,{suc : true});
			}
		});
	});

};
//找到符合条件的
Compress.prototype.findFile = function( directory ){
	var opts = this.opts;
	var thiz = this;
	if(fs.existsSync(directory)){
		var files = fs.readdirSync(directory);
		for(var i=0,max=files.length;i<max;i++){
			var temp = files[i],
				filePath = path.join(directory,temp);
			//1.js;2.是否在排除范围内
			var stats = fs.statSync(filePath);
			if(stats.isDirectory() && opts.deepth){//文件夹
				thiz.findFile(filePath);//继续查找
			}else{
				var extname = path.extname(filePath).toLowerCase();	
				if(extname === '.js'){//js文件
					thiz.fileList.push(filePath);
				}
			}
		}
	}
};

module.exports = Compress;