import numpy as np
import modern_robotics as mr
import math as m
from modern_robotics import core

def FKinBody(M, Blist, thetalist):
    T = np.array(M)
    for i in range(len(thetalist) - 1, - 1, -1):
        T = np.dot(mr.MatrixExp6(mr.VecTose3(np.array(Blist)[:,i]*thetalist[i])),T)
    return T
list = [0,m.pi / 2,-m.pi/2,1]
M = [
    [1 , 0 , 0 , 0],
    [0 , 1 , 0 , 2],
    [0 , 0 , 1 , 1],
    [0 , 0 , 0 , 1]
]
B = [
    [0 , 0 , 0 , 0],
    [0 , 0 , 0 , 0],
    [1 , 1 , 1 , 0],
    [-2 , -1 , 0 , 0],
    [0 , 0 , 0 , 0],
    [0 , 0 , 0 , 1]
]
print(FKinBody(M,B,list))

S = [
    [0 , 0 , 0 , 0],
    [0 , 0 , 0 , 0],
    [1 , 1 , 1 , 0],
    [0 , 1 , 2 , 0],
    [0 , 0 , 0 , 0],
    [0 , 0 , 0 , 1]
]

T2 = core.FKinSpace(M, S, list)
print(T2)
print(core.FKinBody(M,B,list))