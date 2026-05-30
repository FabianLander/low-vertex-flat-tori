import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class PictureCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener,KeyListener {
    Manager M;
    int VERTEX;
    Point JX;
    int[][] FACE;
    int PATTERN;

     public PictureCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 addKeyListener(this);
	 setScales(250,250,70);
	 VERTEX=0;
	 FACE=null;
	 PATTERN=-1;
     }


   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      if(M.C.DISPLAY.L[1].on==1) drawHexagons(g);
      drawFace(g);
      drawEdgeCover(g);
      drawPattern(g);
      drawVertexCover(g);
      
   }

    public void drawBG(Graphics2D g) {
	g.setColor(new Color(225,100,255));
	try {
    	   g.setColor(M.C.DISPLAY.M[0].C);
	}
	catch(Exception e) {}
        g.fillRect(0,0,getWidth(),getHeight());
    }

    
    public void drawHexagons(Graphics2D g) {
	g.setColor(M.C.DISPLAY.M[1].C);
	Path2D.Double q=new Path2D.Double();
	for(int i=-10;i<10;++i) {
	    for(int j=-10;j<10;++j) {
		Complex c=Triangulation.point(i,j);
	        q=Triangulation.hex(c);
	        q=transform(q);
	        g.draw(q);
	    }
	}
    }

    public void drawSpecialEdge(Graphics2D g,int[][] list) {
	for(int i=0;i<list.length;++i) {
	    drawSpecialEdge(g,list[i]);
	}
    }
    
    
    public void drawSpecialEdge(Graphics2D g,int[] e) {
	Path2D.Double q=new Path2D.Double();

	//edges
	double[][] p={{0,0},{1,0},{0,1},{1,1},{-1,-1},{0,-1},{-1,0}};

        int e2=edgeType(e[0],e[1]);
	
	Color COL=M.C.DISPLAY.M[3].C;

	for(int i=-5;i<5;++i) {
	    for(int j=-5;j<5;++j) {
		for(int k=1;k<7;++k) {
		   q.reset();
		   Complex c1=Triangulation.point(i,j);
		   Complex c2=Triangulation.point(i+p[k][0],j+p[k][1]);
		   Complex[] c={c1,c2};
		   int ee2=edgeType(c);

		   if(e2==ee2) {
                       q.moveTo(c1.x,c1.y);
		       q.lineTo(c2.x,c2.y);
	               q=transform(q);
		       g.setStroke(new BasicStroke(4));
	               g.setColor(COL);
	               g.draw(q);
		   }
		}
	    }
	   g.setStroke(new BasicStroke(1));
	}
    }


    public void drawSpecialFace(Graphics2D g,int[][] f) {
	for(int i=0;i<f.length;++i) drawSpecialFace(g,f[i]);
     }
    
    public void drawSpecialFace(Graphics2D g,int[] f) {
	for(int i0=-6;i0<6;++i0) {
	    for(int i1=-6;i1<6;++i1) {
	for(int j0=-6;j0<6;++j0) {
	    for(int j1=-6;j1<6;++j1) {
	for(int k0=-6;k0<6;++k0) {
	    for(int k1=-6;k1<6;++k1) {
		int i=type(i0,i1);
		int j=type(j0,j1);
		int k=type(k0,k1);
		if((i==f[0])&&(j==f[1])&&(k==f[2])) {
	            Complex c0=Triangulation.point(i0,i1);
	            Complex c1=Triangulation.point(j0,j1);
	            Complex c2=Triangulation.point(k0,k1);
		    if((Complex.dist(c0,c1)<2)&&(Complex.dist(c1,c2)<2)) {
			Path2D.Double p=new Path2D.Double();
			p.moveTo(c0.x,c0.y);
			p.lineTo(c1.x,c1.y);
			p.lineTo(c2.x,c2.y);
			p.closePath();
			p=transform(p);
			g.setColor(M.C.DISPLAY.M[4].C);
      			g.fill(p);
			g.setColor(Color.black);
			g.draw(p);
		    }
		}
	    }
	}
	    }
	}
	    }
	}
    }


    


    
    public void drawEdgeCover(Graphics2D g) {
	Path2D.Double q=new Path2D.Double();

	//edges
	double[][] p={{0,0},{1,0},{0,1},{1,1},{-1,-1},{0,-1},{-1,0}};

	int[] e=closestPoints(SOURCE);
        int e3=faceType(e);
	
	Color COL=M.C.DISPLAY.M[3].C;
	for(int i=-9;i<9;++i) {
	    for(int j=-9;j<9;++j) {
		for(int k=1;k<7;++k) {
		   q.reset();
		   Complex c1=Triangulation.point(i,j);
		   Complex c2=Triangulation.point(i+p[k][0],j+p[k][1]);
		   Complex[] c={c1,c2};
		   q.moveTo(c1.x,c1.y);
		   q.lineTo(c2.x,c2.y);
	           q=transform(q);
	           g.setColor(COL);
	           g.draw(q);
		   g.setStroke(new BasicStroke(1));
		}
	    }
	}
    }
    
    public void drawVertexCover(Graphics2D g) {
	Path2D.Double q=new Path2D.Double();
	Font f=new Font("Helvetica",Font.PLAIN,25);
	Color COL1=M.C.DISPLAY.M[2].C;
	for(int i=-10;i<10;++i) {
	    for(int j=-10;j<10;++j) {
		Complex c=Triangulation.point(i,j);
	        fillPoint(g,c,.25,COL1,100);
		Integer A=Integer.valueOf(type(i,j));
		Complex z0=transformDirect(c);
	        String S=A.toString();
		Color COL2=Color.black;
		if(COL1.getRed()+COL1.getGreen()+COL1.getBlue()<600) COL2=Color.white;
		drawStringNicely(g,f,S,(int)(z0.x),(int)(z0.y),COL2);
	    }
	}

    }

    public void drawStringNicely(Graphics2D g,Font f,String S,int x0,int y0,Color C) {
	FontMetrics fm=g.getFontMetrics(f);
	int t1=fm.stringWidth(S);
	int t2=fm.getHeight();
	int x=x0-7;
	int y=y0+7;
	g.setFont(f);
	g.setColor(C);
	g.drawString(S,x,y);
    }
    

    public void drawFace(Graphics2D g) {
	if(FACE==null) return;
	for(int i=0;i<FACE.length;++i) {
  	    drawFace(g,FACE[i],M.C.DISPLAY.M[4].C);
	}
    }
    
    
	public void drawFace(Graphics2D g,int[] A,Color COL) {
	for(int i1=-3;i1<4;++i1) {
	for(int i2=-3;i2<4;++i2) {
	for(int j1=-3;j1<4;++j1) {
	for(int j2=-3;j2<4;++j2) {
	for(int k1=-3;k1<4;++k1) {
	for(int k2=-3;k2<4;++k2) {
	    Complex a=Triangulation.point(i1,i2);
	    Complex b=Triangulation.point(j1,j2);
	    Complex c=Triangulation.point(k1,k2);
	    int t1=type(i1,i2);
	    int t2=type(j1,j2);
	    int t3=type(k1,k2);
	    if((t1==A[0])&&(t2==A[1])&&(t3==A[2])) {
		if((Complex.dist(a,b)<2)&&(Complex.dist(b,c)<2)&&(Complex.dist(a,c)<2)) {
		Path2D.Double p=new Path2D.Double();
		  p.moveTo(a.x,a.y);
		  p.lineTo(b.x,b.y);
		  p.lineTo(c.x,c.y);
		  p=transform(p);
		  g.setColor(COL);
	          g.fill(p);
		}
	    }
	}
	}
	}
	}
	}
	}
    }


    public void drawPattern(Graphics2D g) {
	if(PATTERN==-1) return;
        int[][] list=LinkAnalyzer.internalEdges(PATTERN);
        int[][] face=LinkAnalyzer.internalFaces(PATTERN);
        drawSpecialFace(g,face);
        drawSpecialEdge(g,list);
    }

    
    public void mousePressed(MouseEvent e) { }
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2) {
	    SOURCE=unTransform(J.X);
  	    recognizePoint();
	}
	M.repaint();
    }

    public void doMouseClick(int mode) { 
        if(mode==1)  scaleUp(JX,0);
        if(mode==3)  scaleUp(JX,1);
	if(mode==2) {
	    SOURCE=unTransform(JX);
  	    recognizePoint();
	}
	M.repaint();
    }


    

    public void mouseDragged(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(J.mode==2) {
	    SOURCE=unTransform(J.X);
	}
	M.repaint();
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {
	 requestFocus();
     }
    
     public void mouseExited(MouseEvent e) {}   

     public void mouseMoved(MouseEvent e) {
	 MouseData J=MouseData.process(e);
	 JX=J.X;
     }


    public void keyPressed(KeyEvent e) {
	char ch=e.getKeyChar();
	int test=-1;
	if(ch=='z') test=1;   //zoom in
	if(ch=='x') test=2;
	if(ch=='c') test=3;   //zoom out
	doMouseClick(test);
    }


    public void keyTyped(KeyEvent e) {}
    public void keyReleased(KeyEvent e) {
    }


    public void recognizePoint() {
	VERTEX=closestPoint(SOURCE);
    }

    public int closestPoint(Complex s) {
	double min=1000;
	int[] index={0,0};

	for(int i=-10;i<10;++i) {
	    for(int j=-10;j<10;++j) {
		Complex c=Triangulation.point(i,j);
		double test=Complex.dist(c,s);
		if(test<min) {
		    min=test;
		    index[0]=i;
		    index[1]=j;
		}
	    }
	}
	int k=type(index[0],index[1]);
	return k;
    }

    public static int type(int i,int j) {
	int k=(i+2*j+700)%7;
	return k;
    }


    public int[] closestPoints(Complex s) {
	int[] p={0,0,0,0,0,0,0};
	double tol=1.3;

	for(int i=-10;i<10;++i) {
	    for(int j=-10;j<10;++j) {
		Complex c=Triangulation.point(i,j);
		double test=Complex.dist(c,s);
		if(test<tol) {
		    int k=type(i,j);
		    p[k]=1;
		}
	    }
	}
	return p;
    }


    public int vtxType(int[] p) {
	int sum=0;
	for(int i=0;i<7;++i) {
	    sum=sum+p[i];
	}
	if(sum!=1) return -1;
	for(int i=0;i<7;++i) {
	    if(p[i]==1) return i;
	}
	return -1;
    }

    public int edgeType(int[] p) {
	int sum=0;
	for(int i=0;i<7;++i) {
	    sum=sum+p[i];
	}
	if(sum!=2) return -1;
       	int[] a=new int[2];
	int count=0;
	for(int i=0;i<7;++i) {
	    if(p[i]==1) {
		a[count]=i;
		++count;
	    }
	}
	return edgeType(a[0],a[1]);
    }


    public int edgeType(Complex[] z) {
	int k0=closestPoint(z[0]);
	int k1=closestPoint(z[1]);
	return edgeType(k0,k1);
    }

    public int edgeType(int k0,int k1) {
	int count=0;
	for(int i=0;i<7;++i) {
	    for(int j=i+1;j<7;++j) {
		if((k0==i)&&(k1==j)) {
		    return count;
		}
		if((k0==j)&&(k1==i)) {
		    return count;
		}
		++count;
	    }
	}
	return -1;
    }

    public int faceType(int a,int b,int c) {
	int [] A={a,b,c};
	Arrays.sort(A);
	for(int i=0;i<14;++i) {
	    int[] B=LinkAnalyzer.face(i);
	    Arrays.sort(B);
	    if((A[0]==B[0])&&(A[1]==B[1])&&(A[2]==B[2])) return i;
	}
	return -1;
    }

    public int faceType(int[] p) {
	int sum=0;
	for(int i=0;i<7;++i) {
	    sum=sum+p[i];
	}
	if(sum!=3) return -1;
       	int[] a=new int[3];
	int count=0;
	for(int i=0;i<7;++i) {
	    if(p[i]==1) {
		a[count]=i;
		++count;
	    }
	}
	return faceType(a[0],a[1],a[2]);
    }

    
}

