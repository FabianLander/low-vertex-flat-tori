import java.awt.*;
import java.math.*;
import java.util.Arrays;




public class TriangleCheckerBig {

    /**This is the basic embedding routine: just true or false.*/

    public static boolean embedded(TorusBig T) {
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal v=embeddedRobust(T);
	if(v.compareTo(ZERO)==-1) return true;
	return false;
    }
    
    /**If this is negative then the torus is embedded*/
    
    public static BigDecimal embeddedRobust(TorusBig T) {
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal ONE=new BigDecimal("1");
	boolean crit=criticalTest(T);
       	if(crit==false) return ONE;
	
 	BigDecimal[][] test=assignValues(T);
	if(test==null) return ONE;
	BigDecimal M=new BigDecimal("-100000");
	for(int i=0;i<288;++i) {
	    BigDecimal m=new BigDecimal("1");
	    for(int j=0;j<3;++j) {
		m=m.min(test[i][j]);
	    }
	    M=M.max(m);
	}
	return M;
    }


    /**This gets the actual volumes*/

    public static BigDecimal[][] assignValues(TorusBig T) {
	BigDecimal[][] I=new BigDecimal[288][3];
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal ONE=new BigDecimal("1");
        for(int i=0;i<288;++i) {
	    BigDecimal M=ONE;
	   for(int j=0;j<3;++j) {
	    int k=3*i+j;
	    int[][] L=BlockData.data(k);
	    int[] LL=BlockData.dataIndex(k);
            BigDecimal t0=volume(T,L[0]);
            BigDecimal t1=volume(T,L[1]);
	    int n0=t0.compareTo(ZERO);
	    int n1=t1.compareTo(ZERO);
	    if(n0*n1==1) I[i][j]=ONE;
	    if(n0*n1==0) I[i][j]=ONE;
	    if(n0*n1==-1) {
		t0=t0.abs();
		t1=t1.abs();
		BigDecimal t=t0.min(t1);
		t=t.negate();
		I[i][j]=t; //negative here: means misses
	    }
	    M=M.min(I[i][j]);
	   }
	   if(M.compareTo(ZERO)==1) {
	       System.out.println("bad "+i);
	       return null;
	   }
       }
       return I;
    }

    /**This is the critical test.  These are the things fail
       for our cone bundle test*/
    
    public static boolean criticalTest(TorusBig T) {
	int[] crit={12,14,36,77,88};
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal ONE=new BigDecimal("1");
        for(int i0=0;i0<5;++i0) {
	    int i=crit[i0];
	    boolean test=false;
	    for(int j=0;j<3;++j) {
	       int k=3*i+j;
	       int[][] L=BlockData.data(k);
               BigDecimal t0=volume(T,L[0]);
               BigDecimal t1=volume(T,L[1]);
	       int n0=t0.compareTo(ZERO);
	       int n1=t1.compareTo(ZERO);
	       if(n0*n1==-1) test=true;
	   }
	   if(test==false) return false;
	}
	return true;
    }



    public static boolean embeddedCompare(TorusBig T) {
	BigDecimal ZERO=new BigDecimal("0");
	Torus T2=PaperTorus.shape();
	for(int i=0;i<70;++i) {
	    int[] A=BlockData.lookup(i);
	    BigDecimal d=volume(T,A);
	    int t=d.compareTo(ZERO);
	    int t2=TriangleChecker.volumeSign(T2,A);
	    if(t!=t2) return false;
	}
	return true;
    }
    


    public static BigDecimal volume(TorusBig T,int[] A) {
	VectorBig[] V=new VectorBig[3];
	for(int i=0;i<3;++i) V[i]=VectorBig.minus(T.U[A[i]],T.U[A[3]]);
	BigDecimal d=VectorBig.dot(V[0],VectorBig.cross(V[1],V[2]));
	return d;
    }

}
