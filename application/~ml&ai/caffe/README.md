# Caffe

## 单机

```bash
$ nvidia-docker run -ti bvlc/caffe:gpu caffe --version 
```

训练：

```bash
$ docker run --rm -u $(id -u):$(id -g) -v $(pwd):$(pwd) -w $(pwd) bvlc/caffe:gpu caffe train --solver=example_solver.prototxt  
```
