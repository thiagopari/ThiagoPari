#!/bin/bash
# Per water level: COLMAP 3.9.1 CPU SIFT + exhaustive matching + mapper (same as the site's run_colmap.sh),
# then image_undistorter and OpenMVS DensifyPointCloud (CPU, Docker). GPU patch-match gives empty depth maps on this GPU.
set -u
SRC=${SRC:-$HOME/Projects/underwater-sfm-degradation/viewer/assets/frames}
OUT=${OUT:-runs}; NT=${NT:-6}
for L in ${LEVELS:-clear IB II III 1C 3C 5C}; do
  W=$OUT/$L; mkdir -p $W/sparse txt/$L
  if [ ! -f $W/sparse/0/images.bin ]; then
    colmap feature_extractor --database_path $W/db.db --image_path $SRC/$L --ImageReader.single_camera 1 --ImageReader.camera_model SIMPLE_RADIAL --SiftExtraction.use_gpu 0 --SiftExtraction.num_threads $NT > $W/log.txt 2>&1
    colmap exhaustive_matcher --database_path $W/db.db --SiftMatching.use_gpu 0 --SiftMatching.num_threads $NT >> $W/log.txt 2>&1
    colmap mapper --database_path $W/db.db --image_path $SRC/$L --output_path $W/sparse --Mapper.num_threads $NT >> $W/log.txt 2>&1
  fi
  colmap model_converter --input_path $W/sparse/0 --output_path txt/$L --output_type TXT >> $W/log.txt 2>&1
  [ -d $W/dense/images ] || colmap image_undistorter --image_path $SRC/$L --input_path $W/sparse/0 --output_path $W/dense >> $W/log.txt 2>&1
  colmap model_converter --input_path $W/dense/sparse --output_path $W/dense/sparse --output_type TXT >> $W/log.txt 2>&1
  [ -f $W/dense/scene_dense.ply ] || docker run --rm --cpus $NT -u $(id -u):$(id -g) -v "$PWD/$W/dense":/w -w /w openmvs/openmvs-ubuntu:latest sh -c \
    "B=/openMVS_build/bin; \$B/InterfaceCOLMAP -i . -o scene.mvs --image-folder images && \$B/DensifyPointCloud scene.mvs --resolution-level 0 --max-threads $NT -o scene_dense.mvs" > $W/dense/openmvs.log 2>&1
  echo "$L: models $(ls $W/sparse | tr '\n' ' ') dense $(grep -a -m1 'element vertex' $W/dense/scene_dense.ply 2>/dev/null || echo MISSING)"
done
