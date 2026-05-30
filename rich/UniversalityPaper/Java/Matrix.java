import java.awt.event.*;
import java.awt.*;

/*This class does the basic arithmetic
  of 3x3 matrices */


public class Matrix {
    double[][] a=new double[3][3];

    
    public Matrix(){}

    public Matrix(double[][] aa) {
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		this.a[i][j]=aa[i][j];
	    }
	}
    }

    public Matrix(Vector[] V) {
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		this.a[i][j]=V[i].x[j];
	    }
	}
    }

    public static Matrix identity() {
	Matrix M=new Matrix();
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		if(i==j) M.a[i][j]=1;
	    }
	}
	return M;
    }


    public static Matrix permute(int k) {
	Matrix M=new Matrix();
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		if(i==(j+k)%3) M.a[i][j]=1;
	    }
	}
	return M;
    }
    
    public static Matrix times(Matrix M1,Matrix M2) {
	Matrix M=new Matrix();
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		M.a[i][j]=0;
		for(int k=0;k<3;++k) {
		    M.a[i][j]=M.a[i][j]+M1.a[i][k]*M2.a[k][j];
		}
	    }
	}
	return(M);
    }


    public void print() {

	System.out.println("matrix");
	System.out.println(a[0][0]+ " "+a[0][1]+" "+a[0][2]);
	System.out.println(a[1][0]+ " "+a[1][1]+" "+a[1][2]);
	System.out.println(a[2][0]+ " "+a[2][1]+" "+a[2][2]);
    }



    public double det() {

	double a1=a[0][0]*a[1][1]*a[2][2];
	double a2=a[0][1]*a[1][2]*a[2][0];
	double a3=a[0][2]*a[1][0]*a[2][1];

	double b1=a[2][0]*a[1][1]*a[0][2];
	double b2=a[2][1]*a[1][2]*a[0][0];
	double b3=a[2][2]*a[1][0]*a[0][1];

	return(a1+a2+a3-b1-b2-b3);
    }


    public Matrix inverse() {

	Matrix M=new Matrix();

	M.a[0][0]= a[1][1]*a[2][2]-a[1][2]*a[2][1];
	M.a[0][1]= a[1][2]*a[2][0]-a[1][0]*a[2][2];
	M.a[0][2]= a[1][0]*a[2][1]-a[1][1]*a[2][0];

	M.a[1][0]= a[2][1]*a[0][2]-a[2][2]*a[0][1];
	M.a[1][1]= a[2][2]*a[0][0]-a[2][0]*a[0][2];
	M.a[1][2]= a[2][0]*a[0][1]-a[2][1]*a[0][0];

	M.a[2][0]= a[0][1]*a[1][2]-a[0][2]*a[1][1];
	M.a[2][1]= a[0][2]*a[1][0]-a[0][0]*a[1][2];
	M.a[2][2]= a[0][0]*a[1][1]-a[0][1]*a[1][0];

	double d=this.det();

	Matrix TM=new Matrix();

	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		TM.a[j][i]=M.a[i][j]/d;
	    }
	}
	return(TM);
    }

    public Matrix transpose() {
	Matrix m=new Matrix();
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		m.a[i][j]=this.a[j][i];
	    }
	}
	return m;
    }

    

    public static Vector act(Matrix M,Vector V) {
	double[] b={0,0,0};
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		b[i]=b[i]+M.a[i][j]*V.x[j];
	    }
	}
	return new Vector(b);
    }



    //generic rotation matrix
    public static Matrix rotate(double pitch, double roll, double yaw) {
    // Rotation about Z (yaw)
    double[][] Rz = {
        {Math.cos(yaw), -Math.sin(yaw), 0},
        {Math.sin(yaw),  Math.cos(yaw), 0},
        {0,             0,              1}
    };

    // Rotation about X (pitch)
    double[][] Rx = {
        {1, 0,              0},
        {0, Math.cos(pitch), -Math.sin(pitch)},
        {0, Math.sin(pitch),  Math.cos(pitch)}
    };

    // Rotation about Y (roll)
    double[][] Ry = {
        { Math.cos(roll), 0, Math.sin(roll)},
        { 0,              1, 0},
        {-Math.sin(roll), 0, Math.cos(roll)}
    };

    // Compose in order: R = Ry * Rx * Rz
    Matrix Mz = new Matrix(Rz);
    Matrix Mx = new Matrix(Rx);
    Matrix My = new Matrix(Ry);

    return Matrix.times(My, Matrix.times(Mx, Mz));
}

}



