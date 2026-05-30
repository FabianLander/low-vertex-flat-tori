import java.awt.event.*;
import java.awt.*;
import java.math.*;


/*This class does the basic arithmetic
  of 3x3 matrices using the BigDecimalClass*/


public class MatrixBig {
    BigDecimal[][] a=new BigDecimal[3][3];
    int PRECISION;
    
    public MatrixBig(){}

    public MatrixBig(BigDecimal[][] aa, int p) {
    this.a = new BigDecimal[3][3];
    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            this.a[i][j] = aa[i][j];
        }
    }
    this.PRECISION = p;
}


  public static MatrixBig inverse(MatrixBig M) {
    MathContext mc = new MathContext(M.PRECISION);
    BigDecimal[][] a = M.a;
    BigDecimal[][] inv = new BigDecimal[3][3];

    //cofactors
    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            int i1 = (i + 1) % 3;
            int i2 = (i + 2) % 3;
            int j1 = (j + 1) % 3;
            int j2 = (j + 2) % 3;
            BigDecimal term1 = a[i1][j1].multiply(a[i2][j2], mc);
            BigDecimal term2 = a[i1][j2].multiply(a[i2][j1], mc);
            inv[i][j] = term1.subtract(term2, mc);
        }
    }

    //cofactor expansion for det - using row 0
    BigDecimal det = BigDecimal.ZERO;
    for (int j = 0; j < 3; ++j) {
        det = det.add(a[0][j].multiply(inv[0][j], mc), mc);
    }

    //divide through by det
    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            inv[i][j] = inv[i][j].divide(det, mc);
        }
    }

    return new MatrixBig(inv, M.PRECISION);
  }

    
    
    public VectorBig act(VectorBig V) {
	MathContext mc=new MathContext(this.PRECISION);
	BigDecimal ZERO=new BigDecimal("0");
	VectorBig W=new VectorBig(ZERO,ZERO,ZERO,this.PRECISION);
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		W.x[i]=W.x[i].add(this.a[i][j].multiply(V.x[j],mc),mc);
	    }
	}
	W.PRECISION=this.PRECISION;
	return(W);
    }


    
    public void print() {
	System.out.println("matrix");
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		System.out.println(a[i][j].toString());
		System.out.print(" ");
	    }
	    System.out.println("");
	}
    }


    /**This is present for debugging purposes*/
    
    public static MatrixBig times(MatrixBig M1,MatrixBig M2) {
	MatrixBig M=new MatrixBig();
	MathContext mc=new MathContext(M1.PRECISION);
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		M.a[i][j]=new BigDecimal("0");
		for(int k=0;k<3;++k) {
		    M.a[i][j]=M.a[i][j].add(M1.a[i][k].multiply(M2.a[k][j],mc),mc);
		}
	    }
	}
	M.PRECISION=M1.PRECISION;
	return(M);
    }
    
    
}




