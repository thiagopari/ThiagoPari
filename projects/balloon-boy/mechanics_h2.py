import numpy as np
import math as m
A = np.array([[m.sqrt(2), 1, 0],
              [0, 1, 2*m.sqrt(2)],
              [2, -1, 0]])
print(A)
B = np.array([[0 , 1/m.sqrt(2), -m.sqrt(2)],
              [2 , 1/m.sqrt(2), m.sqrt(2)],
              [m.sqrt(2),-m.sqrt(2), -2]])
print(B)
print(B@np.linalg.inv(A))

T = np.array([[0 , 0 , 1 , -75],
              [-1/m.sqrt(2) , 1/m.sqrt(2) , 0 , -260/m.sqrt(2)],
              [-1/m.sqrt(2) , -1/m.sqrt(2), 0 , 160/m.sqrt(2)],
              [0 , 0 , 0 , 1]])
R = np.array([[0 , 0 , 1 ],
              [-1/m.sqrt(2) , 1/m.sqrt(2) , 0 ],
              [-1/m.sqrt(2) , -1/m.sqrt(2), 0 ]])
p = np.array([[-75],
              [-260/m.sqrt(2)],
              [160/m.sqrt(2)]])
print(np.linalg.inv(T))
print(np.linalg.inv(-R)@p)
print(np.linalg.inv(R))