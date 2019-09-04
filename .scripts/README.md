# 脚本

```sh
$ find . -type d -empty # 查找所有的空目录
$ find . -type f -empty # 查找所有的空文件
$ find . -type d -path .git -prune | xargs chmod 755 # 统一修改目录权限为 755
$ find . -type f -path .git -prune | xargs chmod 644 # 统一修改文件权限为 644
```