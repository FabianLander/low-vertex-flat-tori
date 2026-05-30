import java.awt.event.*;
import java.awt.*;

/*This class does the basic arithmetic
  of complex numbers */

public class ListHelp {


    public static void printout(int[] I) {
	if(I==null) return;
	for(int i=0;i<I.length;++i) System.out.print(I[i]+" ");
	System.out.println("");
    }


    public static void printout(double[] I) {
	if(I==null) return;
	for(int i=0;i<I.length;++i) System.out.print(I[i]+" ");
	System.out.println("");
    }

    public static void printout2(double[] I) {
	if(I==null) return;
	System.out.print("{");
	for(int i=0;i<I.length;++i) {
	    System.out.print(I[i]);
	    if(i<I.length-1) System.out.print(",");
	}
	System.out.println("},");
    }

    public static void printout(int[] I,int n) {
	if(I==null) return;
	for(int i=0;i<n;++i) System.out.print(I[i]+" ");
	System.out.println("");
    }

    public static boolean match(int[] a,int[] b) {
	if(a.length!=b.length) return false;
	for(int i=0;i<a.length;++i) {
	    if(onList(a[i],b,a.length)==false) return false;
	}
	return true;
    }

    
    public static int[] trim(int[] list,int k) {
	int[] list2=new int[k];
	for(int i=0;i<k;++i) list2[i]=list[i];
	return list2;
    }

    public static boolean onList(int a,int[] b,int k) {
	for(int i=0;i<k;++i) {
	    if(a==b[i]) return true;
	}
	return false;
    }
    
    public static int[][] reorderCommonFirst(int[] A, int[] B) {
	int[] AA = {-1,-1,-1};
	int[] BB = {-1,-1,-1};
       int count=0;
       
       for(int i=0;i<3;++i) {
	   for(int j=0;j<3;++j) {
	       if(A[i]==B[j]) {
		   AA[count]=A[i];
		   BB[count]=B[j];
		   ++count;
	       }
	   }
       }

       int count1=count;
       for(int i=0;i<3;++i) {
	   boolean test=false;
	   for(int j=0;j<3;++j) {
	       if(A[i]==B[j]) test=true;
	   }
	   if(test==false) {
	       AA[count1]=A[i];
	       ++count1;
	   }
       }


       count1=count;
       for(int i=0;i<3;++i) {
	   boolean test=false;
	   for(int j=0;j<3;++j) {
	       if(B[i]==A[j]) test=true;
	   }
	   if(test==false) {
	       BB[count1]=B[i];
	       ++count1;
	   }
       }

       int[][] C={AA,BB};
       return C;
    }

    /**generates permutations of size 7*/
    
 public static int[] per8(int k) {
     int[] elements = {0, 1, 2, 3, 4, 5, 6, 7};
        int[] result = new int[8];
        boolean[] used = new boolean[8];
        int[] factorial = {1, 1, 2, 6, 24, 120, 720, 5040, 40320};  // factorial[n]

        for (int i = 0; i < 8; i++) {
            int f = factorial[7 - i];
            int index = k / f;
            k = k % f;

            // Select the index-th unused number
            int count = -1;
            for (int j = 0; j < 8; j++) {
                if (!used[j]) {
                    count++;
                }
                if (count == index) {
                    result[i] = elements[j];
                    used[j] = true;
                    break;
                }
            }
        }

        return result;
    }


    public static int[] per8Inverse(int k) {
	int[] p=per8(k);
	int[] q=new int[8];
	for(int i=0;i<8;++i) q[p[i]]=i;
	return q;
    }
    


    


}


