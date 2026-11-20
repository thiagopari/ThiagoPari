#!/bin/bash
# Reconstruct each water level from the public viewer frames (800x600) with COLMAP 3.9.1.
set -u
SRC=${SRC:?path to underwater-sfm-degradation/viewer/assets/frames}
OUT=${OUT:-runs}
for L in clear IB II III 1C 3C 5C; do
  W=$OUT/$L; mkdir -p $W/sparse
  colmap feature_extractor --database_path $W/db.db --image_path $SRC/$L \
    --ImageReader.single_camera 1 --ImageReader.camera_model SIMPLE_RADIAL --SiftExtraction.use_gpu 0 > $W/log.txt 2>&1
  colmap exhaustive_matcher --database_path $W/db.db --SiftMatching.use_gpu 0 >> $W/log.txt 2>&1
  colmap mapper --database_path $W/db.db --image_path $SRC/$L --output_path $W/sparse >> $W/log.txt 2>&1
  echo "$L done: $(ls $W/sparse)"
done
