
public class Foliation {

    
    public static Complex[] leaf(Complex[] TRI,double[] VAL,double s) {
	Complex a=TRI[0];
	Complex b=TRI[1];
	Complex c=TRI[2];
	double va=VAL[0];
	double vb=VAL[1];
	double vc=VAL[2];

        double min = Math.min(va, Math.min(vb, vc));
        double max = Math.max(va, Math.max(vb, vc));
	if(s<min) return null;
	if(s>max) return null;

        Complex[] segment = new Complex[2];
        int count = 0;

        // Edge ab
        if ((s - va) * (s - vb) <= 0 && va != vb) {
           double u = (s - va) / (vb - va);
           segment[count] = Complex.plus(a.scale(1 - u), b.scale(u));
	   ++count;
        }

       // Edge bc
       if ((s - vb) * (s - vc) <= 0 && vb != vc) {
           double u = (s - vb) / (vc - vb);
           segment[count] = Complex.plus(b.scale(1 - u), c.scale(u));
           ++count;
       }

       // Edge ca
       if ((s - vc) * (s - va) <= 0 && vc != va) {
           double u = (s - vc) / (va - vc);
           segment[count] = Complex.plus(c.scale(1 - u), a.scale(u));
	   ++count;
       }

      return segment;
    }


}
