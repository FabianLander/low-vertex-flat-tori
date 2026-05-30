
import java.util.Arrays;

public class TriangleChecker {
    
    public static boolean embedded(Torus T) {
	int[][] PAIRS=BlockData.dataCompressed();
	int[][] LOOKUP=BlockData.lookup();
	return embedded(T,PAIRS,LOOKUP);
    }

    public static boolean embeddedCompare(Torus T) {
	Torus T2=PaperTorus.shape();
	for(int i=0;i<70;++i) {
	    int[] A=BlockData.lookup(i);
	    int t=volumeSign(T,A);
	    int t2=volumeSign(T2,A);
	    if(t!=t2) {
		return false;
	    }
	}
	return true;
    }
    
    public static boolean embedded(Torus T,int[][] PAIRS,int[][] LOOKUP) {
	
        for(int i=0;i<288;++i) {
	    boolean test=false;
	   for(int j=0;j<3;++j) {
	    int k=3*i+j;
  	    int[] a=PAIRS[k];
	    int[] b={Math.abs(a[0])-1,Math.abs(a[1])-1};
	    int[] L0=LOOKUP[b[0]];
	    int[] L1=LOOKUP[b[1]];
            int t0=volumeSign(T,L0);
            int t1=volumeSign(T,L1);
	    if(a[0]*a[1]*t0*t1<0) {
		test=true;
		break;
	    }
	   }
	    if(test==false) return false;
	}
	return true;
    }


    public static int volumeSign(Torus T,int[] A) {
	Vector[] V=new Vector[3];
	for(int i=0;i<3;++i) V[i]=Vector.minus(T.U[A[i]],T.U[A[3]]);
	double d=Vector.dot(V[0],Vector.cross(V[1],V[2]));
	if(Math.abs(d)<Math.pow(10,-15)) return 0;
	if(d<0) return -1;
	if(d>0) return +1;
	return 0;
    }


    public static int volumeSignMatchMathematica(Torus T,int[] A) {
	Vector[] V=new Vector[3];
	for(int i=0;i<3;++i) V[i]=Vector.minus(T.U[A[i+1]],T.U[A[0]]);
	double d=Vector.dot(V[0],Vector.cross(V[1],V[2]));
	if(Math.abs(d)<Math.pow(10,-15)) return 0;
	if(d<0) return -1;
	if(d>0) return +1;
	return 0;
    }


    public static void listVolumes(Torus T) {
	int[] list4=new int[70];
	int count4=0;
	for(int i=0;i<70;++i) {
	    int[] A=BlockData.lookup(i);
	    int t=volumeSignMatchMathematica(T,A);
	    if(t==1) {
		list4[count4]=i;
		++count4;
	    }
	}
	list4=Arrays.copyOf(list4,count4);
	ListHelp.printout(list4);
    }
    


    /**This tries to match the determinant signs with the original pup tent*/

    
}
