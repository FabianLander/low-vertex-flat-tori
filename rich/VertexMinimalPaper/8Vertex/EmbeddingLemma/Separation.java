import java.awt.event.*;
import java.awt.*;
import java.math.BigInteger;

public class Separation {


    /**This is the big test.  We do it for 120 = 24 + 72 + 24 vectors.
       This returns the separation gap in each case.*/

    public static VectorBig mainTest(int choice,int k) {
	for(int i=-300;i<=300;++i) {
	    for(int j=-300;j<=300;++j) {
		VectorBig L0=new VectorBig(300,i,j);
		VectorBig L1=new VectorBig(i,300,j);
		VectorBig L2=new VectorBig(i,j,300);
		if(separatorWorks(choice,k,L0)==true) return L0;
		if(separatorWorks(choice,k,L1)==true) return L1;
		if(separatorWorks(choice,k,L2)==true) return L2;
	    }
	}
	return null;
    }


    

    /**This tests whether there is a separating gap using the vector L.
       If so, then "dot with L" is a linear function that separates the
       two triangles.  In this case, we return the size of the gap. Otherwise
       we return -1*/

    public static boolean separatorWorks(int choice,int k,VectorBig L) {
	BigInteger G = BigInteger.TEN.pow(30);
	G=G.multiply(new BigInteger("6"));
	BigInteger g=gap(choice,k,L);
	if(g.compareTo(G)==1) return true;
	return false;
    }

    public static BigInteger gap(int choice,int k,VectorBig L) {
   	if(choice==0) return gap0(k,L);
       	if(choice==1) return gap1(k,L);
	return new BigInteger("-1");
    }

    public static BigInteger gap0(int k,VectorBig L) {
	BigInteger[][] d=LF0(k,L);
	BigInteger[] d0=d[0];
	BigInteger[] d1=d[1];
	if(d0[1].compareTo(d1[0])<0) return d1[0].subtract(d0[1]);
	if(d1[1].compareTo(d0[0])<0) return d0[0].subtract(d1[1]);
       	return new BigInteger("-1");
    }


    public static BigInteger gap1(int k,VectorBig L) {
     	BigInteger[][] d=LF1(k,L);
	BigInteger[] d0=d[0];
	BigInteger[] d1=d[1];

    	if(d0[2].compareTo(d1[2])!=0) System.out.println(1/0); //error
	if(d0[0].compareTo(d0[1])>0) System.out.println(1/0); //error
	if(d1[0].compareTo(d1[1])>0) System.out.println(1/0); //error

	
	if(d0[1].compareTo(d1[0])<0) {
	    BigInteger gap0=d1[0].subtract(d0[2]);
	    BigInteger gap1=d0[2].subtract(d0[1]);
	    return gap0.min(gap1);
	}

	if(d1[1].compareTo(d0[0])<0) {
	    BigInteger gap0=d0[0].subtract(d1[2]);
	    BigInteger gap1=d1[2].subtract(d1[1]);
	    return gap0.min(gap1);
	}
	return new BigInteger("-1");
    }

    /**This routine applies the linear functional (based on the vector L) to
       each of the vertices in the given triangle pair and reports on the
       min and max value in each case*/

    /*no common vertices*/
    
    public static BigInteger[][] LF0(int k,VectorBig L) {
        BigInteger googol0 = BigInteger.TEN.pow(100);
	BigInteger googol1 = googol0.negate();
	BigInteger[] d0={googol0,googol1,googol1};
	BigInteger[] d1={googol0,googol1,googol1};
    	VectorBig[] T0=triangle(0,k,0);
        VectorBig[] T1=triangle(0,k,1);
	
	for(int i=0;i<3;++i) {
	    BigInteger test=VectorBig.dot(L,T0[i]);
	    d0[0]=d0[0].min(test);
	    d0[1]=d0[1].max(test);
	}
	for(int i=0;i<3;++i) {
	    BigInteger test=VectorBig.dot(L,T1[i]);
	    d1[0]=d1[0].min(test);
	    d1[1]=d1[1].max(test);
	}
	BigInteger[][] d={d0,d1};
	return d;
    }




    
    public static BigInteger[][] LF1(int k,VectorBig L) {
        BigInteger googol0 = BigInteger.TEN.pow(100);
	BigInteger googol1 = googol0.negate();  //negative
	BigInteger[] d0={googol0,googol1,googol1};
	BigInteger[] d1={googol0,googol1,googol1};
  	VectorBig[] T0=triangle(1,k,0);
        VectorBig[] T1=triangle(1,k,1);

	/**we are not testing the 0th vertex because it is common*/
	for(int i=1;i<3;++i) {
	    BigInteger test=VectorBig.dot(L,T0[i]);
	    d0[0]=d0[0].min(test);
	    d0[1]=d0[1].max(test);
	}
	for(int i=1;i<3;++i) {
	    BigInteger test=VectorBig.dot(L,T1[i]);
	    d1[0]=d1[0].min(test);
	    d1[1]=d1[1].max(test);
	}

	/**Here we are explicitly checking the common vertex*/
	d0[2]=VectorBig.dot(L,T0[0]);
	d1[2]=VectorBig.dot(L,T1[0]);
	BigInteger[][] d={d0,d1};
	return d;
    }


    /**This gets the separating vector to use in the main test above*/

    /**This gets the triangle pairs to test*/


    /**This gets the triangle pairs to test*/
    public static VectorBig[] triangle(int choice,int k,int q) {
	int[][][] D=TRI(choice);
	VectorBig[] V=IntegerTorus.main2(); //new pup tent
	int[][] E=D[k];
	int[] f=E[q];
	VectorBig[] A={V[f[0]],V[f[1]],V[f[2]]};
	return A;
    }

    /**Here are the lists of pairs of triangle faces */
    
    public static int[][][] TRI(int choice) {
	if(choice==0) return D0();
	if(choice==1) return D1();
	return null;
    }


    public static int[][][] D0() {
    return new int[][][] {
        {{3,5,6}, {2,1,4}},  // 0,13
        {{3,5,6}, {2,0,7}},  // 0,14
        {{3,5,6}, {2,7,1}},  // 0,15
        {{3,2,5}, {6,7,4}},  // 1,10
        {{3,2,5}, {6,0,1}},  // 1,11
        {{3,2,5}, {6,1,7}},  // 1,12
        {{3,6,4}, {5,7,0}},  // 2,9
        {{3,6,4}, {2,0,7}},  // 2,14
        {{3,6,4}, {2,7,1}},  // 2,15
        {{3,0,2}, {5,4,7}},  // 3,8
        {{3,0,2}, {6,7,4}},  // 3,10
        {{3,0,2}, {6,1,7}},  // 3,12
        {{3,4,1}, {5,0,6}},  // 4,6
        {{3,4,1}, {5,7,0}},  // 4,9
        {{3,4,1}, {2,0,7}},  // 4,14
        {{3,1,0}, {5,2,4}},  // 5,7
        {{3,1,0}, {5,4,7}},  // 5,8
        {{3,1,0}, {6,7,4}},  // 5,10
        {{5,0,6}, {2,1,4}},  // 6,13
        {{5,0,6}, {2,7,1}},  // 6,15
        {{5,2,4}, {6,0,1}},  // 7,11
        {{5,2,4}, {6,1,7}},  // 7,12
        {{5,4,7}, {6,0,1}},  // 8,11
        {{5,7,0}, {2,1,4}}   // 9,13
    };
    }
    
public static int[][][] D1() {
    return new int[][][] {
        {{3,5,6}, {3,0,2}},  // 0,3
        {{3,5,6}, {3,4,1}},  // 0,4
        {{3,5,6}, {3,1,0}},  // 0,5
        {{5,3,6}, {5,2,4}},  // 0,7
        {{5,3,6}, {5,4,7}},  // 0,8
        {{5,3,6}, {5,7,0}},  // 0,9
        {{6,3,5}, {6,7,4}},  // 0,10
        {{6,3,5}, {6,0,1}},  // 0,11
        {{6,3,5}, {6,1,7}},  // 0,12

        {{3,2,5}, {3,6,4}},  // 1,2
        {{3,2,5}, {3,4,1}},  // 1,4
        {{3,2,5}, {3,1,0}},  // 1,5
        {{5,3,2}, {5,0,6}},  // 1,6
        {{5,3,2}, {5,4,7}},  // 1,8
        {{5,3,2}, {5,7,0}},  // 1,9
        {{2,3,5}, {2,1,4}},  // 1,13
        {{2,3,5}, {2,0,7}},  // 1,14
        {{2,3,5}, {2,7,1}},  // 1,15

        {{3,6,4}, {3,0,2}},  // 2,3
        {{3,6,4}, {3,1,0}},  // 2,5
        {{6,3,4}, {6,5,0}},  // 2,6
        {{4,3,6}, {4,5,2}},  // 2,7
        {{4,3,6}, {4,5,7}},  // 2,8
        {{6,3,4}, {6,0,1}},  // 2,11
        {{6,3,4}, {6,1,7}},  // 2,12
        {{4,3,6}, {4,2,1}},  // 2,13

        {{3,0,2}, {3,4,1}},  // 3,4
        {{0,3,2}, {0,5,6}},  // 3,6
        {{2,3,0}, {2,5,4}},  // 3,7
        {{0,3,2}, {0,5,7}},  // 3,9
        {{0,3,2}, {0,6,1}},  // 3,11
        {{2,3,0}, {2,1,4}},  // 3,13
        {{2,3,0}, {2,7,1}},  // 3,15

        {{4,3,1}, {4,5,2}},  // 4,7
        {{4,3,1}, {4,5,7}},  // 4,8
        {{4,3,1}, {4,6,7}},  // 4,10
        {{1,3,4}, {1,6,0}},  // 4,11
        {{1,3,4}, {1,6,7}},  // 4,12
        {{1,3,4}, {1,2,7}},  // 4,15

        {{0,3,1}, {0,5,6}},  // 5,6
        {{0,3,1}, {0,5,7}},  // 5,9
        {{1,3,0}, {1,6,7}},  // 5,12
        {{1,3,0}, {1,2,4}},  // 5,13
        {{0,3,1}, {0,2,7}},  // 5,14
        {{1,3,0}, {1,2,7}},  // 5,15

        {{5,0,6}, {5,2,4}},  // 6,7
        {{5,0,6}, {5,4,7}},  // 6,8
        {{6,5,0}, {6,7,4}},  // 6,10
        {{6,5,0}, {6,1,7}},  // 6,12
        {{0,5,6}, {0,2,7}},  // 6,14

        {{5,2,4}, {5,7,0}},  // 7,9
        {{4,5,2}, {4,6,7}},  // 7,10
        {{2,5,4}, {2,0,7}},  // 7,14
        {{2,5,4}, {2,7,1}},  // 7,15

        {{7,5,4}, {7,6,1}},  // 8,12
        {{4,5,7}, {4,2,1}},  // 8,13
        {{7,5,4}, {7,2,0}},  // 8,14
        {{7,5,4}, {7,2,1}},  // 8,15

        {{7,5,0}, {7,6,4}},  // 9,10
        {{0,5,7}, {0,6,1}},  // 9,11
        {{7,5,0}, {7,6,1}},  // 9,12
        {{7,5,0}, {7,2,1}},  // 9,15

        {{6,7,4}, {6,0,1}},  // 10,11
        {{4,6,7}, {4,2,1}},  // 10,13
        {{7,6,4}, {7,2,0}},  // 10,14
        {{7,6,4}, {7,2,1}},  // 10,15

        {{1,6,0}, {1,2,4}},  // 11,13
        {{0,6,1}, {0,2,7}},  // 11,14
        {{1,6,0}, {1,2,7}},  // 11,15

        {{1,6,7}, {1,2,4}},  // 12,13
        {{7,6,1}, {7,2,0}},  // 12,14

        {{2,1,4}, {2,0,7}},  // 13,14
    };
}

    
    
}



