import java.awt.event.*;
import java.awt.*;
import java.util.Arrays;

public class Slicer {


    /**This routine slices a tetrahedron*/

    public static Complex[][] tetraSlice(Torus T,Matrix mm,int k,double d) {
	int[] t=BlockData.lookup(k);
	int[][] f={{0,1,2},{0,1,3},{0,2,3},{1,2,3}};
	Complex[][] LIST=new Complex[4][2];
	int count=0;

	for(int i=0;i<4;++i) {
	    int[] g=f[i];
	    Vector[] V={T.U[t[g[0]]],T.U[t[g[1]]],T.U[t[g[2]]]};
  	    Complex[] Z=Slicer.intersectTriangle(mm,V,d,f[i]);
      	    if(Z!=null) {
		LIST[i]=Z;
	    }
	    else LIST[i]=null;
	}
	return LIST;
    }





    
    /**This is what lets you take slices of the pup tent*/



    public static Complex[][] getSegments(Torus T,Matrix mm,double d) {
    	int[][] f=TriangulationCombinatorics.tiling();
	int count=0;
	Complex[][] LIST=new Complex[16][2];
	
	for(int i=0;i<16;++i) {
	    int[] g=f[i];
	    Vector[] V={T.U[g[0]],T.U[g[1]],T.U[g[2]]};
  	    Complex[] Z=Slicer.intersectTriangle(mm,V,d,f[i]);
      	    if(Z!=null) {
		Z[0].tri=i;
		Z[1].tri=i;
		LIST[i]=Z;
	    }
	    else LIST[i]=null;
	}
	return LIST;
    }


    public static Complex[][] getSegmentsMinimal(Torus T,Matrix mm,double d) {
    	int[][] f=TriangulationCombinatorics.tiling();
	int count=0;
	Complex[][] LIST=new Complex[16][2];
	
	for(int i=0;i<16;++i) {
	    int[] g=f[i];
	    Vector[] V={T.U[g[0]],T.U[g[1]],T.U[g[2]]};
  	    Complex[] Z=Slicer.intersectTriangle(mm,V,d,f[i]);
      	    if(Z!=null) {
		Z[0].tri=i;
		Z[1].tri=i;
		LIST[count]=Z;
		++count;
	    }
	}
	return Arrays.copyOf(LIST,count);
    }


    
    public static Complex[][] getSegmentsLoop(Torus T,Matrix mm,double d) {
	Complex[][] L=getSegmentsMinimal(T,mm,d);
	int[] order=getOrder(L,0);
	Complex[] Z=getLoop(L,order);
	
	if(order.length==L.length) {
	    Complex[][] ZZ={Z};
	    return ZZ;
	}

	int index=-1;
	for(int i=0;i<L.length;++i) {
	    if(ListHelp.onList(i,order,order.length)==false) {
		index=i;
		break;
	    }
	}


	
        order=getOrder(L,index);
	Complex[] Z2=getLoop(L,order);
	Complex[][] ZZ={Z,Z2};
	return ZZ;
	
    }


    public static Complex[] getLoop(Complex[][] L,int[] order) {
	Complex[] W=new Complex[order.length];
	for(int i=0;i<order.length;++i) {
	    W[i]=L[order[i]][0];
	}
	return W;
    }

    


    
    public static Complex intersectSegment(Matrix mm,Vector[] V0,double d) {
	Vector[] V=new Vector[2];
	V[0]=new Vector(V0[0]);
	V[1]=new Vector(V0[1]);
	V[0]=Matrix.act(mm,V[0]);
	V[1]=Matrix.act(mm,V[1]);
	
	double x0=V[0].x[0];
	double y0=V[0].x[1];
	double z0=V[0].x[2];
	double x1=V[1].x[0];
	double y1=V[1].x[1];
	double z1=V[1].x[2];
	double test=(z0-d)*(z1-d);
	if(test>0) return null;
	double a=x0*(1 - (-d + z0)/(z0 - z1)) + (x1*(-d + z0))/(z0 - z1);
	double b=y0*(1 - (-d + z0)/(z0 - z1)) + (y1*(-d + z0))/(z0 - z1);
	return new Complex(a,b);
    }

    public static Complex[] intersectTriangle(Matrix mm,Vector[] V,double d,int[] f) {
	Complex[] list=new Complex[2];
	int count=0;
	for(int i=0;i<3;++i) {
	    int j=(i+1)%3;
	    Vector[] W={V[i],V[j]};
	    Complex z=Slicer.intersectSegment(mm,W,d);
	    if(z!=null) {
		list[count]=z;
		z.edge[0]=f[i];
		z.edge[1]=f[j];
		++count;
	    }
	}
	if(count<2) return null;
	return list;
    }


    public static int[] getOrder(Complex[][] L,int q) {
	int[] order=new int[L.length+1];
	order[0]=q;
	for(int i=1;i<L.length+1;++i) order[i]=-1;
	int count=1;
	boolean test=false;
	while(test==false) {
	    order[count]=nextIndex(L,order[count-1]);
	    if(order[count]==q) test=true;
	    ++count;
	}
	order=Arrays.copyOf(order,count-1);
	return order;
    }
	

    public static int nextIndex(Complex[][] Z,int k) {
  	int[] e0=Z[k][1].edge;
	for(int i=0;i<Z.length;++i) {
	    if(i!=k) {
	       if(ListHelp.match(e0,Z[i][0].edge)==true) {
		   return i;
	       }
	       if(ListHelp.match(e0,Z[i][1].edge)==true) {
		   Z[i]=swap(Z[i]);
		   return i;
	       }
	    }
	}
	return -1;
    }


    public static Complex[] swap(Complex[] A) {
	Complex[] B={A[1],A[0]};
	return B;
    }
    

}





