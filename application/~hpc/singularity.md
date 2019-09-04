# Singularity

Singularity is an open source container platform designed to be simple, fast, and secure. Singularity is optimized for EPC and HPC workloads, allowing untrusted users to run untrusted containers in a trusted way.

## 安装

* 依赖

```bash
# Ubuntu
$ sudo apt-get install -y build-essential libtool autotools-dev automake autoconf
```

```bash
VERSION=3.0.1
wget https://github.com/singularityware/singularity/releases/download/$VERSION/singularity-$VERSION.tar.gz
wget https://github.com/sylabs/singularity/releases/tag/v3.0.1
tar xvf singularity-$VERSION.tar.gz
cd singularity-$VERSION
./configure --prefix=/usr/local
make
sudo make install
```

* 编译

```bash
git clone https://github.com/singularityware/singularity.git
cd singularity

./autogen.sh
./configure --prefix=/usr/local

make
sudo make install
```

## 参考

* [github.com/sylabs/singularity](https://github.com/sylabs/singularity)
* [singularity](https://www.jianshu.com/p/5b5e2f1bd057)