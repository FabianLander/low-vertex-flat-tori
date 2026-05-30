import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;


public class ColorManager {

    public static Color copy(Color C) {
	int r=C.getRed();
	int b=C.getBlue();
	int g=C.getGreen();
	int a=C.getAlpha();
	return new Color(r,g,b,a);
    }
    

    /**all white*/
    
    public static void color1(Color[] COL,Color COPY,int S) {
	for(int i=0;i<=S;++i) {
	    COL[i]=copy(COPY);
	}
    }


    /**dark to light: leaves are white*/
    public static void color2(Color[] COL,int S) {
	for(int i=0;i<=S;++i) {
	    int t=(int)(255*i/S);
	    if(t>255) t=255;
	    COL[i]=new Color(t,t,t);
	}
    }

    /**light to dark: stable set is white*/

    public static void color3(Color[] COL,int S) {
	for(int i=0;i<=S;++i) {
	    int t=(int)(255-255*i/S);
	    if(t>255) t=255;
	    COL[i]=new Color(t,t,t);
	}
    }

    /**random*/
    public static Color[] colorLight(int S) {
	Color[] COL=new Color[S];
	double[][] c=decentList(S+1);
	for(int i=0;i<S;++i) {
	    int r=(int)(255*c[i][0]);
	    int g=(int)(255*c[i][1]);
	    int b=(int)(255*c[i][2]);
	    r=(r+255)/2;
	    g=(g+255)/2;
	    b=(b+255)/2;
 	    COL[i]=new Color(r,g,b);
	}
	return COL;
    }

    public static Color[] colorDark(int S) {
	Color[] COL=new Color[S];
	double[][] c=decentList(S+1);
	for(int i=0;i<S;++i) {
	    int r=(int)(255*c[i][0]);
	    int g=(int)(255*c[i][1]);
	    int b=(int)(255*c[i][2]);
	    r=(r+0)/2;
	    g=(g+0)/2;
	    b=(b+0)/2;
 	    COL[i]=new Color(r,g,b);
	}
	return COL;
    }





    /**This spreads our a list of points in the unit cube*/


    public static double[][] decentList(int k) {
	double[][] c=new double[k][3];
	for(int i=0;i<k;++i) {
	    for(int j=0;j<3;++j) c[i][j]=Math.random();
	}
	for(int i=0;i<100000;++i) perturb(c);
	return c;
    }

    public static void perturb(double[][] c) {
	double[] d={Math.random(),Math.random(),Math.random()};
	int i=(int)(c.length*Math.random());
	double e1=localEnergy(c,c[i],i);
	double e2=localEnergy(c,d,i);
	if(e2<e1) {
	    c[i][0]=d[0];
	    c[i][1]=d[1];
	    c[i][2]=d[2];
	}
    }
	
	

    public static double localEnergy(double[][] c,int k) {
	double e=0;
	for(int i=0;i<c.length;++i) {
	    if(i!=k) {
	       e=e+1/dist2(c[i],c[k]);
	    }
	}
	return e;
    }

    public static double localEnergy(double[][] c,double[] d,int k) {
	double e=0;
	for(int i=0;i<c.length;++i) {
	    if(i!=k) {
	       e=e+1/dist2(d,c[k]);
	    }
	}
	return e;
    }

    public static double dist2(double[] a,double[] b) {
	double e=0;
	for(int i=0;i<3;++i) {
	    double c=a[i]-b[i];
	    e=e+c*c;
	}
	return e;
    }


}
