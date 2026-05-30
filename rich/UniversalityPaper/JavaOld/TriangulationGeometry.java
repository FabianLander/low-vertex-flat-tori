import java.util.Arrays;
import java.util.Comparator;

public class TriangulationGeometry {



    /**this gets the cloud point nearest the origin with the given
       label*/

    public static Complex inFundamentalSquare(Complex[] cloud,int label) {
	for(int i=0;i<cloud.length;++i) {
	    if(cloud[i].label==label) {
		double x=cloud[i].x;
		double y=cloud[i].y;
		x=x-Math.floor(x);
		y=y-Math.floor(y);
		return new Complex(x,y);
	    }
	}
	return null;
    }

    
    
    /**this finds the closest point in the orbit of w to z*/
    

    public static Complex closestInTorus(Complex z,Complex w) {
	double min=100;
	Complex h=new Complex();
	for(int i=-3;i<3;++i) {
	    for(int j=-3;j<3;++j) {
		Complex ww=Complex.plus(w,new Complex(i,j));
		double test=Complex.dist(z,ww);
		if(test<min) {
		    h=new Complex(ww);
		    min=test;
		}
	    }
	}
	return h;
    }


    public static Complex closest(Complex z,Complex[] cloud,int label) {
	double min=100;
	Complex h=new Complex();
	for(int i=0;i<cloud.length;++i) {
	    if(cloud[i].label==label) {
		double test=Complex.dist(z,cloud[i]);
		if(test<min) {
		    h=new Complex(cloud[i]);
		    min=test;
		}
	    }
	}
	return h;
    }



    /**this gets the nearest triangle. Should contain the point z*/
    
    public static int[] closestTriangle(Complex z,Complex[] cloud) {
	double[] d=allDistances(z,cloud);
	int[] I=sortIndices(d);
	int[] f=new int[3];
	for(int i=0;i<3;++i) f[i]=cloud[I[i]].label;
	return f;
    }
    
    public static int[] sortIndices(double[] dist) {
       Integer[] idx = new Integer[dist.length];
       for (int i = 0; i < dist.length; i++) idx[i] = i;
       Arrays.sort(idx, Comparator.comparingDouble(i -> dist[i]));
       int[] order = new int[idx.length];
       for (int i = 0; i < idx.length; i++) order[i] = idx[i];
       return order;
    }

    public static double[] allDistances(Complex z,Complex[] cloud) {
	double[] d=new double[cloud.length];
	for(int i=0;i<cloud.length;++i) {
	    d[i]=Complex.dist(z,cloud[i]);
	}
	return d;
    }


    
    

    /**This gets the coords for the triangulation*/
    
    public static Complex[] getCloud() {
	Complex[] z=coords();
	return makePeriodic(z);
    }



    public static Complex[] makePeriodic(Complex[] z) {
	Complex[] list=new Complex[2000];
	int count=0;

	for(int i=-2;i<=2;++i) {
	    for(int j=-2;j<=2;++j) {
		for(int k=0;k<8;++k) {
		    list[count]=Complex.plus(z[k],new Complex(i,j));
		    list[count].label=k;
		    ++count;
		}
	    }
	}
	return Arrays.copyOf(list,count);
    }


    public static Complex[] coords() {
    Complex[] z = {
        new Complex(0.32, 0.219),
        new Complex(0.062, 0.457),
        new Complex(0.169, 0.8),
        new Complex(0.451, 0.58),
        new Complex(0.529, 0.929),
        new Complex(0.799, 0.683),
        new Complex(0.931, 0.06),
        new Complex(0.71, 0.324)
    };
    return z;
}

}
